const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  // Employee reference
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },

  // Payroll period
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  period: {
    type: String,
    required: true,
    enum: ['Monthly', 'Bi-weekly', 'Weekly']
  },

  // Salary information
  baseSalary: {
    type: Number,
    required: true
  },
  grossSalary: {
    type: Number,
    required: true
  },
  netSalary: {
    type: Number,
    required: true
  },

  // Benefits breakdown
  benefits: {
    valeTransporte: {
      dailyValue: { type: Number, default: 0 },
      monthlyDays: { type: Number, default: 22 },
      totalValue: { type: Number, default: 0 },
      additionalDays: { type: Number, default: 0 } // For Saturday workers
    },
    valeRefeicao: {
      dailyValue: { type: Number, default: 0 },
      monthlyDays: { type: Number, default: 22 },
      totalValue: { type: Number, default: 0 }
    },
    mobilidade: {
      monthlyValue: { type: Number, default: 0 }
    }
  },

  // Deductions
  deductions: {
    inss: { type: Number, default: 0 },
    irrf: { type: Number, default: 0 },
    fgts: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Additions
  additions: {
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Working days information
  workingDays: {
    totalDays: { type: Number, default: 22 },
    workedDays: { type: Number, default: 22 },
    absences: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    saturdayDays: { type: Number, default: 0 } // For Saturday workers
  },

  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['Bank Transfer', 'PIX', 'Check', 'Cash'],
      default: 'Bank Transfer'
    },
    bankInfo: {
      bank: String,
      agency: String,
      account: String,
      accountType: String
    },
    pixKey: String,
    status: {
      type: String,
      enum: ['Pending', 'Processed', 'Paid', 'Failed'],
      default: 'Pending'
    },
    paymentDate: Date,
    transactionId: String
  },

  // Invoice information (for PJ employees)
  invoice: {
    invoiceNumber: String,
    invoiceDate: Date,
    dueDate: Date,
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Received', 'Paid'],
      default: 'Pending'
    },
    fileUrl: String,
    notes: String
  },

  // Status and approval
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Processed', 'Paid', 'Cancelled'],
    default: 'Draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,

  // Notes and comments
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: { type: Date, default: Date.now }
  }],

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique payroll per employee per month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// Indexes for better query performance
payrollSchema.index({ month: 1, year: 1 });
payrollSchema.index({ status: 1 });
payrollSchema.index({ 'payment.status': 1 });

// Virtual for total benefits
payrollSchema.virtual('totalBenefits').get(function() {
  return (
    this.benefits.valeTransporte.totalValue +
    this.benefits.valeRefeicao.totalValue +
    this.benefits.mobilidade.monthlyValue
  );
});

// Virtual for total deductions
payrollSchema.virtual('totalDeductions').get(function() {
  return (
    this.deductions.inss +
    this.deductions.irrf +
    this.deductions.fgts +
    this.deductions.other
  );
});

// Virtual for total additions
payrollSchema.virtual('totalAdditions').get(function() {
  return (
    this.additions.overtime +
    this.additions.bonus +
    this.additions.commission +
    this.additions.other
  );
});

// Method to calculate payroll
payrollSchema.methods.calculatePayroll = function() {
  // Calculate benefits
  this.benefits.valeTransporte.totalValue = 
    this.benefits.valeTransporte.dailyValue * 
    (this.benefits.valeTransporte.monthlyDays + this.benefits.valeTransporte.additionalDays);
  
  this.benefits.valeRefeicao.totalValue = 
    this.benefits.valeRefeicao.dailyValue * this.benefits.valeRefeicao.monthlyDays;

  // Calculate gross salary
  this.grossSalary = this.baseSalary + this.totalAdditions;

  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions + this.totalBenefits;

  return this;
};

// Static method to find payrolls by period
payrollSchema.statics.findByPeriod = function(month, year) {
  return this.find({ month, year }).populate('employee', 'firstName lastName email employeeId');
};

// Static method to find pending payments
payrollSchema.statics.findPendingPayments = function() {
  return this.find({ 'payment.status': 'Pending' }).populate('employee', 'firstName lastName email');
};

// Static method to find payrolls by employee
payrollSchema.statics.findByEmployee = function(employeeId, limit = 12) {
  return this.find({ employee: employeeId })
    .sort({ year: -1, month: -1 })
    .limit(limit)
    .populate('employee', 'firstName lastName email');
};

// Pre-save middleware to calculate payroll
payrollSchema.pre('save', function(next) {
  if (this.isModified('baseSalary') || this.isModified('benefits') || 
      this.isModified('deductions') || this.isModified('additions')) {
    this.calculatePayroll();
  }
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema); 