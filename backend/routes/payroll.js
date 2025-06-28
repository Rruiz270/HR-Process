const express = require('express');
const { body, validationResult } = require('express-validator');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { auth, authorize } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// Get all payroll records with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      employeeId, 
      status, 
      month, 
      year,
      sortBy = 'payrollPeriod',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf('month');
      const endDate = moment(startDate).endOf('month');
      filter.payrollPeriod = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const payrolls = await Payroll.find(filter)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    const total = await Payroll.countDocuments(filter);

    res.json({
      payrolls,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payroll by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeId department position')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    res.json(payroll);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new payroll record
router.post('/', auth, authorize('Admin', 'HR'), [
  body('employee').isMongoId().withMessage('Valid employee ID is required'),
  body('payrollPeriod').isISO8601().withMessage('Valid payroll period is required'),
  body('baseSalary').isNumeric().withMessage('Valid base salary is required'),
  body('workingDays').isNumeric().withMessage('Valid working days is required'),
  body('paymentMethod').isIn(['Bank Transfer', 'Check', 'Cash']).withMessage('Valid payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if payroll already exists for this employee and period
    const existingPayroll = await Payroll.findOne({
      employee: req.body.employee,
      payrollPeriod: req.body.payrollPeriod
    });

    if (existingPayroll) {
      return res.status(400).json({ error: 'Payroll already exists for this employee and period' });
    }

    // Get employee details
    const employee = await Employee.findById(req.body.employee);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Calculate payroll components
    const payrollData = {
      ...req.body,
      createdBy: req.user._id,
      status: 'Draft'
    };

    // Calculate benefits
    if (employee.benefits.valeTransporte.enabled) {
      payrollData.benefits.valeTransporte = {
        enabled: true,
        value: employee.benefits.valeTransporte.dailyValue * req.body.workingDays
      };
    }

    if (employee.benefits.valeRefeicao.enabled) {
      payrollData.benefits.valeRefeicao = {
        enabled: true,
        value: employee.benefits.valeRefeicao.dailyValue * req.body.workingDays
      };
    }

    if (employee.benefits.mobilidade.enabled) {
      payrollData.benefits.mobilidade = {
        enabled: true,
        value: employee.benefits.mobilidade.monthlyValue
      };
    }

    // Calculate total
    const totalBenefits = Object.values(payrollData.benefits)
      .filter(benefit => benefit.enabled)
      .reduce((sum, benefit) => sum + benefit.value, 0);

    const totalDeductions = (payrollData.deductions || [])
      .reduce((sum, deduction) => sum + deduction.amount, 0);

    const totalAdditions = (payrollData.additions || [])
      .reduce((sum, addition) => sum + addition.amount, 0);

    payrollData.total = payrollData.baseSalary + totalBenefits + totalAdditions - totalDeductions;

    const payroll = new Payroll(payrollData);
    await payroll.save();

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Payroll created successfully',
      payroll: populatedPayroll
    });
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update payroll record
router.put('/:id', auth, authorize('Admin', 'HR'), [
  body('baseSalary').optional().isNumeric(),
  body('workingDays').optional().isNumeric(),
  body('deductions').optional().isArray(),
  body('additions').optional().isArray(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Don't allow updates if already approved
    if (payroll.status === 'Approved') {
      return res.status(400).json({ error: 'Cannot update approved payroll' });
    }

    const updateData = { ...req.body, updatedBy: req.user._id };

    // Recalculate total if salary or benefits changed
    if (req.body.baseSalary || req.body.workingDays || req.body.deductions || req.body.additions) {
      const employee = await Employee.findById(payroll.employee);
      
      // Recalculate benefits
      const benefits = { ...payroll.benefits };
      if (employee.benefits.valeTransporte.enabled) {
        benefits.valeTransporte = {
          enabled: true,
          value: employee.benefits.valeTransporte.dailyValue * (req.body.workingDays || payroll.workingDays)
        };
      }

      if (employee.benefits.valeRefeicao.enabled) {
        benefits.valeRefeicao = {
          enabled: true,
          value: employee.benefits.valeRefeicao.dailyValue * (req.body.workingDays || payroll.workingDays)
        };
      }

      if (employee.benefits.mobilidade.enabled) {
        benefits.mobilidade = {
          enabled: true,
          value: employee.benefits.mobilidade.monthlyValue
        };
      }

      updateData.benefits = benefits;

      // Calculate new total
      const totalBenefits = Object.values(benefits)
        .filter(benefit => benefit.enabled)
        .reduce((sum, benefit) => sum + benefit.value, 0);

      const totalDeductions = (req.body.deductions || payroll.deductions || [])
        .reduce((sum, deduction) => sum + deduction.amount, 0);

      const totalAdditions = (req.body.additions || payroll.additions || [])
        .reduce((sum, addition) => sum + addition.amount, 0);

      updateData.total = (req.body.baseSalary || payroll.baseSalary) + totalBenefits + totalAdditions - totalDeductions;
    }

    const updatedPayroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('employee', 'firstName lastName email employeeId department')
    .populate('approvedBy', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json({
      message: 'Payroll updated successfully',
      payroll: updatedPayroll
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve payroll
router.put('/:id/approve', auth, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    if (payroll.status === 'Approved') {
      return res.status(400).json({ error: 'Payroll is already approved' });
    }

    payroll.status = 'Approved';
    payroll.approvedBy = req.user._id;
    payroll.approvalDate = new Date();
    payroll.updatedBy = req.user._id;

    await payroll.save();

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Payroll approved successfully',
      payroll: populatedPayroll
    });
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request invoice for PJ employee
router.post('/:id/request-invoice', auth, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeId invoiceInfo');

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    if (payroll.employee.employmentType !== 'PJ') {
      return res.status(400).json({ error: 'Invoice can only be requested for PJ employees' });
    }

    if (payroll.invoiceInfo && payroll.invoiceInfo.status === 'Requested') {
      return res.status(400).json({ error: 'Invoice already requested' });
    }

    payroll.invoiceInfo = {
      status: 'Requested',
      requestDate: new Date(),
      requestedBy: req.user._id,
      amount: payroll.total,
      description: `Payroll for ${moment(payroll.payrollPeriod).format('MMMM YYYY')}`,
      employeeInfo: payroll.employee.invoiceInfo
    };

    payroll.updatedBy = req.user._id;
    await payroll.save();

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName email employeeId invoiceInfo')
      .populate('invoiceInfo.requestedBy', 'firstName lastName');

    res.json({
      message: 'Invoice request created successfully',
      payroll: populatedPayroll
    });
  } catch (error) {
    console.error('Request invoice error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payroll statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const filter = {};
    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf('month');
      const endDate = moment(startDate).endOf('month');
      filter.payrollPeriod = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      };
    }

    const stats = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } }
        }
      }
    ]);

    const departmentStats = await Payroll.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      {
        $group: {
          _id: '$employeeData.department',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      overview: stats[0] || { total: 0, totalAmount: 0, approved: 0, pending: 0, paid: 0 },
      byDepartment: departmentStats
    });
  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending invoice requests
router.get('/invoices/pending', auth, async (req, res) => {
  try {
    const payrolls = await Payroll.find({
      'invoiceInfo.status': 'Requested'
    })
    .populate('employee', 'firstName lastName email employeeId invoiceInfo')
    .populate('invoiceInfo.requestedBy', 'firstName lastName')
    .sort({ 'invoiceInfo.requestDate': -1 });

    res.json(payrolls);
  } catch (error) {
    console.error('Get pending invoices error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate payroll report
router.get('/report/generate', auth, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const { month, year, department, format = 'json' } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const startDate = moment(`${year}-${month}-01`).startOf('month');
    const endDate = moment(startDate).endOf('month');

    const filter = {
      payrollPeriod: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    };

    if (department) {
      // Need to populate employee to filter by department
      const payrolls = await Payroll.find(filter)
        .populate({
          path: 'employee',
          match: { department: department }
        })
        .populate('employee', 'firstName lastName email employeeId department')
        .populate('approvedBy', 'firstName lastName');

      const filteredPayrolls = payrolls.filter(payroll => payroll.employee);

      if (format === 'csv') {
        // Generate CSV format
        const csvData = filteredPayrolls.map(payroll => ({
          'Employee ID': payroll.employee.employeeId,
          'Name': `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          'Department': payroll.employee.department,
          'Base Salary': payroll.baseSalary,
          'Total': payroll.total,
          'Status': payroll.status,
          'Payment Date': payroll.paymentDate ? moment(payroll.paymentDate).format('YYYY-MM-DD') : ''
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll-${year}-${month}.csv`);
        
        // Convert to CSV string
        const csvString = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');

        res.send(csvString);
      } else {
        res.json({
          period: `${month}/${year}`,
          totalRecords: filteredPayrolls.length,
          totalAmount: filteredPayrolls.reduce((sum, p) => sum + p.total, 0),
          payrolls: filteredPayrolls
        });
      }
    } else {
      const payrolls = await Payroll.find(filter)
        .populate('employee', 'firstName lastName email employeeId department')
        .populate('approvedBy', 'firstName lastName');

      if (format === 'csv') {
        const csvData = payrolls.map(payroll => ({
          'Employee ID': payroll.employee.employeeId,
          'Name': `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          'Department': payroll.employee.department,
          'Base Salary': payroll.baseSalary,
          'Total': payroll.total,
          'Status': payroll.status,
          'Payment Date': payroll.paymentDate ? moment(payroll.paymentDate).format('YYYY-MM-DD') : ''
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll-${year}-${month}.csv`);
        
        const csvString = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');

        res.send(csvString);
      } else {
        res.json({
          period: `${month}/${year}`,
          totalRecords: payrolls.length,
          totalAmount: payrolls.reduce((sum, p) => sum + p.total, 0),
          payrolls: payrolls
        });
      }
    }
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 