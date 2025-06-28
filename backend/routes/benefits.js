const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import models
const Employee = require('../models/Employee');
const Benefit = require('../models/Benefit');
const User = require('../models/User');

// Import middleware
const { authenticateToken, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/schedules');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `schedule-${req.body.month}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel, CSV, and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all benefits for a specific month
router.get('/month/:month/:year', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.params;
    const { page = 1, limit = 10, department, status } = req.query;
    
    let query = { month: `${year}-${month.toString().padStart(2, '0')}` };
    
    if (status) {
      query.paymentStatus = status;
    }
    
    const benefits = await Benefit.find(query)
      .populate('employeeId', 'firstName lastName employeeId department position')
      .populate('createdBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Benefit.countDocuments(query);
    
    res.json({
      benefits,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching benefits:', error);
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

// Get benefit for specific employee and month
router.get('/employee/:employeeId/:month/:year', authenticateToken, async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    
    let benefit = await Benefit.findOne({
      employeeId,
      month: `${year}-${month.toString().padStart(2, '0')}`
    }).populate('employeeId', 'firstName lastName employeeId department position benefits');
    
    if (!benefit) {
      // Create new benefit record if it doesn't exist
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      benefit = new Benefit({
        employeeId,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        year: parseInt(year),
        valeRefeicao: {
          enabled: employee.benefits.valeRefeicao.enabled,
          dailyValue: employee.benefits.valeRefeicao.dailyValue,
          businessDays: employee.benefits.valeRefeicao.monthlyDays,
          saturdays: 0
        },
        valeTransporte: {
          enabled: employee.benefits.valeTransporte.enabled,
          fixedAmount: employee.benefits.valeTransporte.fixedAmount,
          dailyValue: employee.benefits.valeTransporte.dailyValue
        },
        mobilidade: {
          enabled: employee.benefits.mobilidade.enabled,
          monthlyValue: employee.benefits.mobilidade.monthlyValue
        },
        createdBy: req.user._id
      });
      
      await benefit.save();
    }
    
    res.json(benefit);
  } catch (error) {
    console.error('Error fetching employee benefit:', error);
    res.status(500).json({ error: 'Failed to fetch employee benefit' });
  }
});

// Create or update benefit calculation
router.post('/calculate', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { employeeId, month, year, valeRefeicao, valeTransporte, mobilidade } = req.body;
    
    let benefit = await Benefit.findOne({
      employeeId,
      month: `${year}-${month.toString().padStart(2, '0')}`
    });
    
    if (!benefit) {
      benefit = new Benefit({
        employeeId,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        year: parseInt(year),
        createdBy: req.user._id
      });
    }
    
    // Update VR data
    if (valeRefeicao) {
      benefit.valeRefeicao = { ...benefit.valeRefeicao, ...valeRefeicao };
    }
    
    // Update VT data
    if (valeTransporte) {
      benefit.valeTransporte = { ...benefit.valeTransporte, ...valeTransporte };
    }
    
    // Update mobilidade data
    if (mobilidade) {
      benefit.mobilidade = { ...benefit.mobilidade, ...mobilidade };
    }
    
    // Calculate amounts
    benefit.calculateVR();
    benefit.calculateVT();
    
    benefit.paymentStatus = 'Calculated';
    benefit.updatedBy = req.user._id;
    
    await benefit.save();
    
    res.json({
      message: 'Benefit calculated successfully',
      benefit
    });
  } catch (error) {
    console.error('Error calculating benefit:', error);
    res.status(500).json({ error: 'Failed to calculate benefit' });
  }
});

// Upload schedule file for VR calculation
router.post('/upload-schedule', authenticateToken, authorize('admin', 'hr'), upload.single('schedule'), async (req, res) => {
  try {
    const { employeeId, month, year, businessDays, saturdays } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    let benefit = await Benefit.findOne({
      employeeId,
      month: `${year}-${month.toString().padStart(2, '0')}`
    });
    
    if (!benefit) {
      return res.status(404).json({ error: 'Benefit record not found. Please calculate benefits first.' });
    }
    
    // Update schedule data
    benefit.valeRefeicao.businessDays = parseInt(businessDays) || 22;
    benefit.valeRefeicao.saturdays = parseInt(saturdays) || 0;
    benefit.valeRefeicao.scheduleFile = {
      url: `/uploads/schedules/${req.file.filename}`,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };
    
    // Recalculate VR
    benefit.calculateVR();
    benefit.updatedBy = req.user._id;
    
    await benefit.save();
    
    res.json({
      message: 'Schedule uploaded successfully',
      benefit
    });
  } catch (error) {
    console.error('Error uploading schedule:', error);
    res.status(500).json({ error: 'Failed to upload schedule' });
  }
});

// Add deduction to benefit
router.post('/deduction', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { benefitId, benefitType, date, amount, reason, type } = req.body;
    
    const benefit = await Benefit.findById(benefitId);
    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }
    
    const deductionData = {
      date: new Date(date),
      amount: parseFloat(amount),
      reason,
      type: type || 'Absence',
      recordedBy: req.user._id,
      recordedAt: new Date()
    };
    
    benefit.addDeduction(benefitType, deductionData);
    benefit.updatedBy = req.user._id;
    
    await benefit.save();
    
    res.json({
      message: 'Deduction added successfully',
      benefit
    });
  } catch (error) {
    console.error('Error adding deduction:', error);
    res.status(500).json({ error: 'Failed to add deduction' });
  }
});

// Approve benefits for payment
router.post('/approve', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { benefitIds } = req.body;
    
    const benefits = await Benefit.find({ _id: { $in: benefitIds } });
    
    for (const benefit of benefits) {
      benefit.paymentStatus = 'Approved';
      benefit.updatedBy = req.user._id;
      await benefit.save();
    }
    
    res.json({
      message: `${benefits.length} benefits approved for payment`
    });
  } catch (error) {
    console.error('Error approving benefits:', error);
    res.status(500).json({ error: 'Failed to approve benefits' });
  }
});

// Send benefits to Flash
router.post('/send-to-flash', authenticateToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { benefitIds } = req.body;
    
    const benefits = await Benefit.find({ 
      _id: { $in: benefitIds },
      paymentStatus: 'Approved',
      'flashPayment.sent': false
    });
    
    let totalAmount = 0;
    const employeeData = [];
    
    for (const benefit of benefits) {
      benefit.sendToFlash(req.user._id);
      totalAmount += benefit.totalBenefitAmount;
      
      employeeData.push({
        employeeId: benefit.employeeId,
        amount: benefit.totalBenefitAmount,
        vrAmount: benefit.valeRefeicao.finalAmount,
        vtAmount: benefit.valeTransporte.finalAmount,
        mobilidadeAmount: benefit.mobilidade.monthlyValue
      });
      
      await benefit.save();
    }
    
    // TODO: Integrate with actual Flash API
    // For now, simulate Flash integration
    const flashResponse = {
      success: true,
      reference: `FLASH-${Date.now()}`,
      totalAmount,
      employeeCount: benefits.length,
      status: 'Processing'
    };
    
    res.json({
      message: `${benefits.length} benefits sent to Flash`,
      flashResponse,
      totalAmount,
      employeeData
    });
  } catch (error) {
    console.error('Error sending to Flash:', error);
    res.status(500).json({ error: 'Failed to send to Flash' });
  }
});

// Get Flash payment status
router.get('/flash-status/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    
    const benefits = await Benefit.find({
      'flashPayment.flashReference': reference
    }).populate('employeeId', 'firstName lastName employeeId');
    
    if (benefits.length === 0) {
      return res.status(404).json({ error: 'Flash reference not found' });
    }
    
    const totalAmount = benefits.reduce((sum, benefit) => sum + benefit.totalBenefitAmount, 0);
    
    res.json({
      reference,
      totalAmount,
      employeeCount: benefits.length,
      benefits,
      status: benefits[0].flashPayment.flashStatus
    });
  } catch (error) {
    console.error('Error fetching Flash status:', error);
    res.status(500).json({ error: 'Failed to fetch Flash status' });
  }
});

// Get benefit statistics
router.get('/statistics/:month/:year', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    
    const stats = await Benefit.aggregate([
      {
        $match: { month: monthStr }
      },
      {
        $group: {
          _id: null,
          totalVR: { $sum: '$valeRefeicao.finalAmount' },
          totalVT: { $sum: '$valeTransporte.finalAmount' },
          totalMobilidade: { $sum: '$mobilidade.monthlyValue' },
          totalAmount: { $sum: '$totalBenefitAmount' },
          employeeCount: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] }
          },
          calculatedCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Calculated'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Approved'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json(stats[0] || {
      totalVR: 0,
      totalVT: 0,
      totalMobilidade: 0,
      totalAmount: 0,
      employeeCount: 0,
      pendingCount: 0,
      calculatedCount: 0,
      approvedCount: 0,
      paidCount: 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get employees eligible for benefits
router.get('/eligible-employees', authenticateToken, async (req, res) => {
  try {
    const { department, employmentType } = req.query;
    
    let query = { status: 'Active' };
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;
    
    const employees = await Employee.find(query)
      .select('firstName lastName employeeId department position employmentType benefits')
      .sort({ firstName: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching eligible employees:', error);
    res.status(500).json({ error: 'Failed to fetch eligible employees' });
  }
});

module.exports = router; 