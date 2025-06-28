const mongoose = require('mongoose');

const benefitSchema = new mongoose.Schema({
  // Basic Information
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: String,
    required: true,
    format: 'YYYY-MM'
  },
  year: {
    type: Number,
    required: true
  },
  
  // Vale Refeição (VR) Details
  valeRefeicao: {
    enabled: { type: Boolean, default: true },
    dailyValue: { type: Number, default: 0 },
    businessDays: { type: Number, default: 22 },
    saturdays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 22 },
    totalAmount: { type: Number, default: 0 },
    deductions: [{
      date: { type: Date, required: true },
      amount: { type: Number, required: true },
      reason: { type: String, required: true },
      type: { type: String, enum: ['Absence', 'Holiday', 'Vacation', 'Other'], default: 'Absence' },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt: { type: Date, default: Date.now }
    }],
    finalAmount: { type: Number, default: 0 },
    scheduleFile: {
      url: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now }
    }
  },
  
  // Vale Transporte (VT) Details
  valeTransporte: {
    enabled: { type: Boolean, default: true },
    fixedAmount: { type: Number, default: 0 },
    dailyValue: { type: Number, default: 0 },
    totalDays: { type: Number, default: 22 },
    totalAmount: { type: Number, default: 0 },
    deductions: [{
      date: { type: Date, required: true },
      amount: { type: Number, required: true },
      reason: { type: String, required: true },
      type: { type: String, enum: ['Absence', 'Holiday', 'Vacation', 'Other'], default: 'Absence' },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt: { type: Date, default: Date.now }
    }],
    finalAmount: { type: Number, default: 0 },
    addressChanged: { type: Boolean, default: false },
    newAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      neighborhood: String
    }
  },
  
  // Other Benefits
  mobilidade: {
    enabled: { type: Boolean, default: false },
    monthlyValue: { type: Number, default: 0 }
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Calculated', 'Approved', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  paymentDate: Date,
  paymentMethod: {
    type: String,
    enum: ['Flash', 'Bank Transfer', 'Check', 'Other'],
    default: 'Flash'
  },
  
  // Flash Integration
  flashPayment: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    flashReference: String,
    flashStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending'
    },
    flashResponse: Object
  },
  
  // Timesheet Integration (Future)
  timesheetData: {
    totalWorkDays: { type: Number, default: 0 },
    absences: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    vacations: { type: Number, default: 0 },
    lastSync: Date
  },
  
  // Notes and Comments
  notes: [{
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// Indexes
benefitSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
benefitSchema.index({ month: 1, year: 1 });
benefitSchema.index({ paymentStatus: 1 });
benefitSchema.index({ 'flashPayment.sent': 1 });

// Virtual for total benefit amount
benefitSchema.virtual('totalBenefitAmount').get(function() {
  let total = 0;
  if (this.valeRefeicao.enabled) total += this.valeRefeicao.finalAmount;
  if (this.valeTransporte.enabled) total += this.valeTransporte.finalAmount;
  if (this.mobilidade.enabled) total += this.mobilidade.monthlyValue;
  return total;
});

// Method to calculate VR
benefitSchema.methods.calculateVR = function() {
  if (!this.valeRefeicao.enabled) return 0;
  
  this.valeRefeicao.totalDays = this.valeRefeicao.businessDays + this.valeRefeicao.saturdays;
  this.valeRefeicao.totalAmount = this.valeRefeicao.totalDays * this.valeRefeicao.dailyValue;
  
  // Apply deductions
  const totalDeductions = this.valeRefeicao.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  this.valeRefeicao.finalAmount = Math.max(0, this.valeRefeicao.totalAmount - totalDeductions);
  
  return this.valeRefeicao.finalAmount;
};

// Method to calculate VT
benefitSchema.methods.calculateVT = function() {
  if (!this.valeTransporte.enabled) return 0;
  
  // For CLT employees, use fixed amount
  this.valeTransporte.totalAmount = this.valeTransporte.fixedAmount;
  
  // Apply deductions
  const totalDeductions = this.valeTransporte.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  this.valeTransporte.finalAmount = Math.max(0, this.valeTransporte.totalAmount - totalDeductions);
  
  return this.valeTransporte.finalAmount;
};

// Method to add deduction
benefitSchema.methods.addDeduction = function(benefitType, deductionData) {
  if (benefitType === 'VR') {
    this.valeRefeicao.deductions.push(deductionData);
  } else if (benefitType === 'VT') {
    this.valeTransporte.deductions.push(deductionData);
  }
  
  // Recalculate amounts
  this.calculateVR();
  this.calculateVT();
};

// Method to send to Flash
benefitSchema.methods.sendToFlash = function(userId) {
  this.flashPayment.sent = true;
  this.flashPayment.sentAt = new Date();
  this.flashPayment.sentBy = userId;
  this.flashPayment.flashStatus = 'Pending';
  this.paymentStatus = 'Approved';
};

// Static method to find benefits by month
benefitSchema.statics.findByMonth = function(month, year) {
  return this.find({ month: `${year}-${month.toString().padStart(2, '0')}` })
    .populate('employeeId', 'firstName lastName employeeId department')
    .populate('createdBy', 'name');
};

// Static method to find pending payments
benefitSchema.statics.findPendingPayments = function() {
  return this.find({ paymentStatus: 'Approved', 'flashPayment.sent': false })
    .populate('employeeId', 'firstName lastName employeeId department')
    .populate('createdBy', 'name');
};

// Static method to get total amount for Flash
benefitSchema.statics.getTotalForFlash = function(month, year) {
  return this.aggregate([
    {
      $match: {
        month: `${year}-${month.toString().padStart(2, '0')}`,
        paymentStatus: 'Approved',
        'flashPayment.sent': false
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalBenefitAmount' },
        employeeCount: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Benefit', benefitSchema); 