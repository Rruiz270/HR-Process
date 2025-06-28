const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:4000',
    'http://localhost:4000',
    'http://localhost:3002', 
    'http://localhost:3003'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple auth middleware for demo
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For demo purposes, accept any token
  req.user = demoUser;
  next();
};

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Demo login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === 'admin@example.com' && password === 'password123') {
      const token = 'demo-jwt-token-' + Date.now();
      res.json({
        token,
        user: {
          _id: demoUser._id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Demo get current user endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    _id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Employee routes
app.get('/api/employees', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, search, department, status } = req.query;
  let filteredEmployees = [...demoEmployees];
  
  if (search) {
    filteredEmployees = filteredEmployees.filter(emp => 
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (department) {
    filteredEmployees = filteredEmployees.filter(emp => emp.department === department);
  }
  
  if (status) {
    filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
  
  res.json({
    employees: paginatedEmployees,
    totalPages: Math.ceil(filteredEmployees.length / limit),
    currentPage: parseInt(page),
    total: filteredEmployees.length
  });
});

app.post('/api/employees', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const employeeData = {
      _id: 'emp-' + Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user._id
    };
    
    demoEmployees.push(employeeData);
    
    res.status(201).json({
      message: 'Employee created successfully',
      employee: employeeData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.get('/api/employees/:id', authenticateToken, (req, res) => {
  const employee = demoEmployees.find(emp => emp._id === req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
});

app.put('/api/employees/:id', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const employeeIndex = demoEmployees.findIndex(emp => emp._id === req.params.id);
    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    demoEmployees[employeeIndex] = {
      ...demoEmployees[employeeIndex],
      ...req.body,
      updatedAt: new Date()
    };
    
    res.json({
      message: 'Employee updated successfully',
      employee: demoEmployees[employeeIndex]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const employeeIndex = demoEmployees.findIndex(emp => emp._id === req.params.id);
    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    demoEmployees.splice(employeeIndex, 1);
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Document routes
app.get('/api/documents', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, search, category, type } = req.query;
  let filteredDocuments = [...demoDocuments];
  
  if (search) {
    filteredDocuments = filteredDocuments.filter(doc => 
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.employeeName?.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (category) {
    filteredDocuments = filteredDocuments.filter(doc => doc.category === category);
  }
  
  if (type) {
    filteredDocuments = filteredDocuments.filter(doc => doc.type === type);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);
  
  res.json({
    documents: paginatedDocuments,
    totalPages: Math.ceil(filteredDocuments.length / limit),
    currentPage: parseInt(page),
    total: filteredDocuments.length
  });
});

app.post('/api/documents', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const documentData = {
      _id: 'doc-' + Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user._id
    };
    
    demoDocuments.push(documentData);
    
    res.status(201).json({
      message: 'Document created successfully',
      document: documentData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/documents/:id', authenticateToken, (req, res) => {
  const document = demoDocuments.find(doc => doc._id === req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(document);
});

app.delete('/api/documents/:id', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const documentIndex = demoDocuments.findIndex(doc => doc._id === req.params.id);
    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    demoDocuments.splice(documentIndex, 1);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Payroll routes
app.get('/api/payroll', authenticateToken, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedPayrolls = demoPayrolls.slice(startIndex, endIndex);
  
  res.json({
    payrolls: paginatedPayrolls,
    totalPages: Math.ceil(demoPayrolls.length / limit),
    currentPage: parseInt(page),
    total: demoPayrolls.length
  });
});

app.post('/api/payroll', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const payrollData = {
      _id: 'payroll-' + Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user._id
    };
    
    demoPayrolls.push(payrollData);
    
    res.status(201).json({
      message: 'Payroll created successfully',
      payroll: payrollData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payroll' });
  }
});

// Email routes
app.post('/api/email/invoice-request', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { employeeId, payrollId, customMessage } = req.body;
    
    // In demo mode, just return success
    res.json({
      message: 'Invoice request email sent successfully',
      messageId: 'demo-message-id',
      to: 'demo@example.com'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/email/payroll-notification', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { payrollId, includeDetails } = req.body;
    
    // In demo mode, just return success
    res.json({
      message: 'Payroll notification email sent successfully',
      messageId: 'demo-message-id',
      to: 'demo@example.com'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Google Drive routes
app.get('/api/google-drive/files', authenticateToken, (req, res) => {
  // Demo response
  res.json({
    files: [
      {
        id: 'demo-file-1',
        name: 'Employee List.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: '1024',
        modifiedTime: new Date().toISOString()
      }
    ],
    nextPageToken: null
  });
});

app.get('/api/google-drive/sheets/:spreadsheetId', authenticateToken, (req, res) => {
  // Demo response
  res.json({
    spreadsheet: {
      spreadsheetId: req.params.spreadsheetId,
      properties: {
        title: 'Demo Employee Data'
      }
    },
    data: [
      ['Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Salary'],
      ['EMP001', 'João', 'Silva', 'joao.silva@empresa.com', 'TI', 'Desenvolvedor', '8500'],
      ['EMP002', 'Maria', 'Santos', 'maria.santos@empresa.com', 'RH', 'Analista', '6500']
    ],
    range: 'A1:G3'
  });
});

app.post('/api/google-drive/sheets/:spreadsheetId/write', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { range, values } = req.body;
    
    res.json({
      message: 'Data written to spreadsheet successfully',
      updatedRange: range,
      updatedRows: values.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write to spreadsheet' });
  }
});

// Benefits routes
app.get('/api/benefits/month/:month/:year', authenticateToken, (req, res) => {
  const { month, year } = req.params;
  const { page = 1, limit = 10, department, status } = req.query;
  
  let filteredBenefits = demoBenefits.filter(benefit => 
    benefit.month === `${year}-${month.toString().padStart(2, '0')}`
  );
  
  if (status) {
    filteredBenefits = filteredBenefits.filter(benefit => benefit.paymentStatus === status);
  }
  
  // Add employee data to benefits
  const benefitsWithEmployeeData = filteredBenefits.map(benefit => {
    const employee = demoEmployees.find(emp => emp._id === benefit.employeeId);
    return {
      ...benefit,
      employeeData: employee ? {
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        department: employee.department,
        position: employee.position
      } : null
    };
  });
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedBenefits = benefitsWithEmployeeData.slice(startIndex, endIndex);
  
  res.json({
    benefits: paginatedBenefits,
    totalPages: Math.ceil(benefitsWithEmployeeData.length / limit),
    currentPage: parseInt(page),
    total: benefitsWithEmployeeData.length
  });
});

app.get('/api/benefits/employee/:employeeId/:month/:year', authenticateToken, (req, res) => {
  const { employeeId, month, year } = req.params;
  
  let benefit = demoBenefits.find(b => 
    b.employeeId === employeeId && 
    b.month === `${year}-${month.toString().padStart(2, '0')}`
  );
  
  if (!benefit) {
    // Create new benefit record if it doesn't exist
    const employee = demoEmployees.find(emp => emp._id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    benefit = {
      _id: 'benefit-' + Date.now(),
      employeeId,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      year: parseInt(year),
      valeRefeicao: {
        enabled: employee.benefits?.valeRefeicao?.enabled || true,
        dailyValue: employee.benefits?.valeRefeicao?.dailyValue || 25.00,
        businessDays: employee.benefits?.valeRefeicao?.monthlyDays || 22,
        saturdays: 0,
        totalDays: 22,
        totalAmount: 0,
        deductions: [],
        finalAmount: 0
      },
      valeTransporte: {
        enabled: employee.benefits?.valeTransporte?.enabled || true,
        fixedAmount: employee.benefits?.valeTransporte?.fixedAmount || 300.00,
        dailyValue: employee.benefits?.valeTransporte?.dailyValue || 0,
        totalDays: 22,
        totalAmount: 0,
        deductions: [],
        finalAmount: 0,
        addressChanged: false
      },
      mobilidade: {
        enabled: employee.benefits?.mobilidade?.enabled || false,
        monthlyValue: employee.benefits?.mobilidade?.monthlyValue || 0
      },
      paymentStatus: 'Pending',
      paymentMethod: 'Flash',
      flashPayment: {
        sent: false,
        flashStatus: 'Pending'
      },
      createdBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    demoBenefits.push(benefit);
  }
  
  // Add employee data
  const employee = demoEmployees.find(emp => emp._id === employeeId);
  const benefitWithEmployee = {
    ...benefit,
    employeeData: employee ? {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeId: employee.employeeId,
      department: employee.department,
      position: employee.position,
      benefits: employee.benefits
    } : null
  };
  
  res.json(benefitWithEmployee);
});

app.post('/api/benefits/calculate', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { employeeId, month, year, valeRefeicao, valeTransporte, mobilidade } = req.body;
    
    let benefit = demoBenefits.find(b => 
      b.employeeId === employeeId && 
      b.month === `${year}-${month.toString().padStart(2, '0')}`
    );
    
    if (!benefit) {
      benefit = {
        _id: 'benefit-' + Date.now(),
        employeeId,
        month: `${year}-${month.toString().padStart(2, '0')}`,
        year: parseInt(year),
        createdBy: req.user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      demoBenefits.push(benefit);
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
    if (benefit.valeRefeicao.enabled) {
      benefit.valeRefeicao.totalDays = benefit.valeRefeicao.businessDays + benefit.valeRefeicao.saturdays;
      benefit.valeRefeicao.totalAmount = benefit.valeRefeicao.totalDays * benefit.valeRefeicao.dailyValue;
      const totalVRDeductions = benefit.valeRefeicao.deductions.reduce((sum, d) => sum + d.amount, 0);
      benefit.valeRefeicao.finalAmount = Math.max(0, benefit.valeRefeicao.totalAmount - totalVRDeductions);
    }
    
    if (benefit.valeTransporte.enabled) {
      benefit.valeTransporte.totalAmount = benefit.valeTransporte.fixedAmount;
      const totalVTDeductions = benefit.valeTransporte.deductions.reduce((sum, d) => sum + d.amount, 0);
      benefit.valeTransporte.finalAmount = Math.max(0, benefit.valeTransporte.totalAmount - totalVTDeductions);
    }
    
    benefit.paymentStatus = 'Calculated';
    benefit.updatedAt = new Date();
    benefit.updatedBy = req.user._id;
    
    res.json({
      message: 'Benefit calculated successfully',
      benefit
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate benefit' });
  }
});

app.post('/api/benefits/deduction', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { benefitId, benefitType, date, amount, reason, type } = req.body;
    
    const benefit = demoBenefits.find(b => b._id === benefitId);
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
    
    if (benefitType === 'VR') {
      benefit.valeRefeicao.deductions.push(deductionData);
      // Recalculate VR
      const totalDeductions = benefit.valeRefeicao.deductions.reduce((sum, d) => sum + d.amount, 0);
      benefit.valeRefeicao.finalAmount = Math.max(0, benefit.valeRefeicao.totalAmount - totalDeductions);
    } else if (benefitType === 'VT') {
      benefit.valeTransporte.deductions.push(deductionData);
      // Recalculate VT
      const totalDeductions = benefit.valeTransporte.deductions.reduce((sum, d) => sum + d.amount, 0);
      benefit.valeTransporte.finalAmount = Math.max(0, benefit.valeTransporte.totalAmount - totalDeductions);
    }
    
    benefit.updatedAt = new Date();
    benefit.updatedBy = req.user._id;
    
    res.json({
      message: 'Deduction added successfully',
      benefit
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add deduction' });
  }
});

app.post('/api/benefits/approve', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { benefitIds } = req.body;
    
    let approvedCount = 0;
    for (const benefitId of benefitIds) {
      const benefit = demoBenefits.find(b => b._id === benefitId);
      if (benefit) {
        benefit.paymentStatus = 'Approved';
        benefit.updatedAt = new Date();
        benefit.updatedBy = req.user._id;
        approvedCount++;
      }
    }
    
    res.json({
      message: `${approvedCount} benefits approved for payment`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve benefits' });
  }
});

app.post('/api/benefits/send-to-flash', authenticateToken, authorize('admin', 'hr'), (req, res) => {
  try {
    const { benefitIds } = req.body;
    
    let totalAmount = 0;
    let sentCount = 0;
    const employeeData = [];
    
    for (const benefitId of benefitIds) {
      const benefit = demoBenefits.find(b => b._id === benefitId);
      if (benefit && benefit.paymentStatus === 'Approved' && !benefit.flashPayment.sent) {
        benefit.flashPayment.sent = true;
        benefit.flashPayment.sentAt = new Date();
        benefit.flashPayment.sentBy = req.user._id;
        benefit.flashPayment.flashReference = `FLASH-${Date.now()}-${sentCount + 1}`;
        benefit.flashPayment.flashStatus = 'Processing';
        benefit.updatedAt = new Date();
        
        const benefitAmount = (benefit.valeRefeicao.finalAmount || 0) + 
                            (benefit.valeTransporte.finalAmount || 0) + 
                            (benefit.mobilidade.monthlyValue || 0);
        
        totalAmount += benefitAmount;
        sentCount++;
        
        employeeData.push({
          employeeId: benefit.employeeId,
          amount: benefitAmount,
          vrAmount: benefit.valeRefeicao.finalAmount || 0,
          vtAmount: benefit.valeTransporte.finalAmount || 0,
          mobilidadeAmount: benefit.mobilidade.monthlyValue || 0
        });
      }
    }
    
    const flashResponse = {
      success: true,
      reference: `FLASH-${Date.now()}`,
      totalAmount,
      employeeCount: sentCount,
      status: 'Processing'
    };
    
    res.json({
      message: `${sentCount} benefits sent to Flash`,
      flashResponse,
      totalAmount,
      employeeData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send to Flash' });
  }
});

app.get('/api/benefits/statistics/:month/:year', authenticateToken, (req, res) => {
  try {
    const { month, year } = req.params;
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    
    const monthBenefits = demoBenefits.filter(b => b.month === monthStr);
    
    const stats = {
      totalVR: monthBenefits.reduce((sum, b) => sum + (b.valeRefeicao.finalAmount || 0), 0),
      totalVT: monthBenefits.reduce((sum, b) => sum + (b.valeTransporte.finalAmount || 0), 0),
      totalMobilidade: monthBenefits.reduce((sum, b) => sum + (b.mobilidade.monthlyValue || 0), 0),
      totalAmount: monthBenefits.reduce((sum, b) => sum + 
        (b.valeRefeicao.finalAmount || 0) + 
        (b.valeTransporte.finalAmount || 0) + 
        (b.mobilidade.monthlyValue || 0), 0),
      employeeCount: monthBenefits.length,
      pendingCount: monthBenefits.filter(b => b.paymentStatus === 'Pending').length,
      calculatedCount: monthBenefits.filter(b => b.paymentStatus === 'Calculated').length,
      approvedCount: monthBenefits.filter(b => b.paymentStatus === 'Approved').length,
      paidCount: monthBenefits.filter(b => b.paymentStatus === 'Paid').length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/benefits/eligible-employees', authenticateToken, (req, res) => {
  try {
    const { department, employmentType } = req.query;
    
    let filteredEmployees = demoEmployees.filter(emp => emp.status === 'Active');
    
    if (department) {
      filteredEmployees = filteredEmployees.filter(emp => emp.department === department);
    }
    
    if (employmentType) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employmentType === employmentType);
    }
    
    const employees = filteredEmployees.map(emp => ({
      _id: emp._id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      employeeId: emp.employeeId,
      department: emp.department,
      position: emp.position,
      employmentType: emp.employmentType,
      benefits: emp.benefits
    }));
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch eligible employees' });
  }
});

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for any non-API route
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Demo credentials: admin@example.com / password123');
});

module.exports = app; 