const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all employees with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      department, 
      status, 
      employmentType, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const employees = await Employee.find(filter)
      .populate('manager', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    const total = await Employee.countDocuments(filter);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new employee
router.post('/', auth, authorize('Admin', 'HR'), [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('cpf').isLength({ min: 11, max: 14 }).withMessage('Valid CPF is required'),
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('hireDate').isISO8601().withMessage('Valid hire date is required'),
  body('employmentType').isIn(['CLT', 'PJ', 'Intern', 'Temporary']).withMessage('Valid employment type is required'),
  body('baseSalary').isNumeric().withMessage('Valid base salary is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: req.body.email },
        { cpf: req.body.cpf },
        { employeeId: req.body.employeeId }
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({ error: 'Employee already exists with this email, CPF, or employee ID' });
    }

    const employee = new Employee({
      ...req.body,
      createdBy: req.user._id
    });

    await employee.save();

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('manager', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Employee created successfully',
      employee: populatedEmployee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update employee
router.put('/:id', auth, authorize('Admin', 'HR'), [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('status').optional().isIn(['Active', 'Inactive', 'Terminated', 'On Leave']),
  body('employmentType').optional().isIn(['CLT', 'PJ', 'Intern', 'Temporary']),
  body('baseSalary').optional().isNumeric(),
  body('workSchedule').optional().isIn(['Monday-Friday', 'Monday-Saturday', 'Flexible', 'Remote'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    )
    .populate('manager', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      message: 'Employee updated successfully',
      employee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete employee
router.delete('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add note to employee
router.post('/:id/notes', auth, [
  body('content').trim().notEmpty().withMessage('Note content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.notes.push({
      content: req.body.content,
      author: req.user._id
    });

    await employee.save();

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('notes.author', 'firstName lastName')
      .populate('manager', 'firstName lastName email');

    res.json({
      message: 'Note added successfully',
      employee: populatedEmployee
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update employee benefits
router.put('/:id/benefits', auth, authorize('Admin', 'HR'), [
  body('benefits').isObject().withMessage('Benefits object is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { 
        benefits: req.body.benefits,
        updatedBy: req.user._id 
      },
      { new: true, runValidators: true }
    )
    .populate('manager', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      message: 'Employee benefits updated successfully',
      employee
    });
  } catch (error) {
    console.error('Update benefits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employees by department
router.get('/department/:department', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ 
      department: req.params.department,
      status: 'Active'
    })
    .populate('manager', 'firstName lastName email')
    .sort({ firstName: 1, lastName: 1 });

    res.json(employees);
  } catch (error) {
    console.error('Get employees by department error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get PJ employees (for invoice processing)
router.get('/type/pj', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ 
      employmentType: 'PJ',
      status: 'Active'
    })
    .populate('manager', 'firstName lastName email')
    .sort({ firstName: 1, lastName: 1 });

    res.json(employees);
  } catch (error) {
    console.error('Get PJ employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update employees
router.put('/bulk/update', auth, authorize('Admin', 'HR'), [
  body('employeeIds').isArray().withMessage('Employee IDs array is required'),
  body('updates').isObject().withMessage('Updates object is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeIds, updates } = req.body;

    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      { ...updates, updatedBy: req.user._id }
    );

    res.json({
      message: `${result.modifiedCount} employees updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
          terminated: { $sum: { $cond: [{ $eq: ['$status', 'Terminated'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'On Leave'] }, 1, 0] } }
        }
      }
    ]);

    const departmentStats = await Employee.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const employmentTypeStats = await Employee.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: '$employmentType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overview: stats[0] || { total: 0, active: 0, inactive: 0, terminated: 0, onLeave: 0 },
      byDepartment: departmentStats,
      byEmploymentType: employmentTypeStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 