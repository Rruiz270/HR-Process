const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  personalEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  cpf: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  birthDate: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    neighborhood: String
  },

  // Work Information
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  hireDate: {
    type: Date,
    required: true
  },
  employmentType: {
    type: String,
    enum: ['CLT', 'PJ', 'Intern', 'Temporary'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Terminated', 'On Leave', 'KPI_Warning'],
    default: 'Active'
  },
  statusColor: {
    type: String,
    enum: ['green', 'orange', 'red', 'yellow'],
    default: 'green'
  },
  workSchedule: {
    type: String,
    enum: ['Monday-Friday', 'Monday-Saturday', 'Flexible', 'Remote'],
    default: 'Monday-Friday'
  },
  
  // Enhanced Work Information
  level: {
    type: String,
    enum: ['Junior', 'Pleno', 'Senior', 'Lead', 'Manager', 'Director'],
    default: 'Junior'
  },
  costCenter: String,
  accountingCode: String, // For CLT employees

  // Payroll Information
  baseSalary: {
    type: Number,
    required: true
  },
  bankInfo: {
    bank: String,
    agency: String,
    account: String,
    accountType: String
  },

  // Enhanced Benefits for CLT Employees
  benefits: {
    valeTransporte: {
      enabled: { type: Boolean, default: true },
      dailyValue: { type: Number, default: 0 },
      monthlyDays: { type: Number, default: 22 },
      fixedAmount: { type: Number, default: 0 }, // Fixed amount per person
      addressBased: { type: Boolean, default: true },
      lastAddressUpdate: { type: Date },
      deductions: [{
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recordedAt: { type: Date, default: Date.now }
      }]
    },
    valeRefeicao: {
      enabled: { type: Boolean, default: true },
      dailyValue: { type: Number, default: 0 },
      monthlyDays: { type: Number, default: 22 },
      businessDaysOnly: { type: Boolean, default: true },
      includeSaturdays: { type: Boolean, default: false },
      scheduleUploads: [{
        month: { type: String, required: true }, // YYYY-MM format
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        fileUrl: String,
        businessDays: { type: Number, default: 22 },
        saturdays: { type: Number, default: 0 }
      }],
      deductions: [{
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recordedAt: { type: Date, default: Date.now }
      }]
    },
    mobilidade: {
      enabled: { type: Boolean, default: false },
      monthlyValue: { type: Number, default: 0 }
    },
    healthInsurance: {
      enabled: { type: Boolean, default: false },
      plan: String,
      dependents: [String]
    },
    dentalInsurance: {
      enabled: { type: Boolean, default: false },
      plan: String,
      dependents: [String]
    }
  },

  // Equipment Tracking
  equipment: [{
    type: {
      type: String,
      enum: ['Laptop', 'Monitor', 'Phone', 'Tablet', 'Headset', 'Other'],
      required: true
    },
    name: { type: String, required: true },
    serialNumber: String,
    assignedDate: { type: Date, default: Date.now },
    returnDate: Date,
    status: {
      type: String,
      enum: ['Assigned', 'Returned', 'Lost', 'Damaged'],
      default: 'Assigned'
    },
    notes: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Document Management
  documents: [{
    type: {
      type: String,
      enum: ['ID', 'CPF', 'WorkCard', 'Contract', 'TaxDocument', 'Other']
    },
    name: String,
    fileUrl: String,
    uploadDate: { type: Date, default: Date.now },
    expiryDate: Date,
    status: {
      type: String,
      enum: ['Valid', 'Expired', 'Pending'],
      default: 'Valid'
    }
  }],

  // Invoice/NFE Information (for PJ employees)
  invoiceInfo: {
    companyName: String,
    cnpj: String,
    address: String,
    email: String,
    phone: String
  },

  // KPI and Performance Tracking
  kpiMetrics: {
    lastReview: Date,
    performanceScore: { type: Number, min: 0, max: 100 },
    attendanceRate: { type: Number, min: 0, max: 100 },
    projectDeliveryRate: { type: Number, min: 0, max: 100 },
    warnings: [{
      type: { type: String, enum: ['Attendance', 'Performance', 'Behavior', 'Other'] },
      description: String,
      date: { type: Date, default: Date.now },
      issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolved: { type: Boolean, default: false },
      resolvedDate: Date
    }]
  },

  // Notes and Observations
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

// Indexes for better query performance
employeeSchema.index({ email: 1 });
employeeSchema.index({ cpf: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ employmentType: 1 });
employeeSchema.index({ birthDate: 1 });
employeeSchema.index({ hireDate: 1 });
employeeSchema.index({ 'benefits.valeTransporte.enabled': 1 });
employeeSchema.index({ 'benefits.valeRefeicao.enabled': 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for work duration
employeeSchema.virtual('workDuration').get(function() {
  if (!this.hireDate) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.hireDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to get active benefits
employeeSchema.methods.getActiveBenefits = function() {
  const activeBenefits = [];
  if (this.benefits.valeTransporte.enabled) activeBenefits.push('Vale Transporte');
  if (this.benefits.valeRefeicao.enabled) activeBenefits.push('Vale Refeição');
  if (this.benefits.mobilidade.enabled) activeBenefits.push('Mobilidade');
  if (this.benefits.healthInsurance.enabled) activeBenefits.push('Health Insurance');
  if (this.benefits.dentalInsurance.enabled) activeBenefits.push('Dental Insurance');
  return activeBenefits;
};

// Method to calculate VR for a specific month
employeeSchema.methods.calculateVR = function(month, year) {
  if (!this.benefits.valeRefeicao.enabled) return 0;
  
  const schedule = this.benefits.valeRefeicao.scheduleUploads.find(
    s => s.month === `${year}-${month.toString().padStart(2, '0')}`
  );
  
  if (!schedule) return 0;
  
  const totalDays = schedule.businessDays + (this.benefits.valeRefeicao.includeSaturdays ? schedule.saturdays : 0);
  return totalDays * this.benefits.valeRefeicao.dailyValue;
};

// Method to calculate VT for a specific month
employeeSchema.methods.calculateVT = function(month, year) {
  if (!this.benefits.valeTransporte.enabled) return 0;
  
  // For CLT employees, use fixed amount
  if (this.employmentType === 'CLT') {
    return this.benefits.valeTransporte.fixedAmount;
  }
  
  // For others, calculate based on days
  return this.benefits.valeTransporte.monthlyDays * this.benefits.valeTransporte.dailyValue;
};

// Static method to generate unique employee ID
employeeSchema.statics.generateEmployeeId = function(department, position) {
  const prefix = this.getDepartmentPrefix(department);
  const year = new Date().getFullYear().toString().slice(-2);
  
  return this.countDocuments({ employeeId: new RegExp(`^${prefix}${year}`) })
    .then(count => {
      const sequence = (count + 1).toString().padStart(2, '0');
      return `${prefix}${year}${sequence}`;
    });
};

// Static method to get department prefix
employeeSchema.statics.getDepartmentPrefix = function(department) {
  const prefixes = {
    'TI': 'BDEV',
    'Financeiro': 'BFIN',
    'RH': 'BHR',
    'Marketing': 'BMKT',
    'Vendas': 'BSLS',
    'Operações': 'BOPS',
    'Administrativo': 'BADM'
  };
  return prefixes[department] || 'BEMP';
};

// Static method to find employees by department
employeeSchema.statics.findByDepartment = function(department) {
  return this.find({ department, status: 'Active' });
};

// Static method to find PJ employees
employeeSchema.statics.findPJEmployees = function() {
  return this.find({ employmentType: 'PJ', status: 'Active' });
};

// Static method to find CLT employees
employeeSchema.statics.findCLTEmployees = function() {
  return this.find({ employmentType: 'CLT', status: 'Active' });
};

// Static method to find employees with birthdays this month
employeeSchema.statics.findBirthdaysThisMonth = function() {
  const currentMonth = new Date().getMonth() + 1;
  return this.find({
    $expr: {
      $eq: [{ $month: '$birthDate' }, currentMonth]
    },
    status: 'Active'
  });
};

// Static method to find employees with work anniversaries this month
employeeSchema.statics.findWorkAnniversariesThisMonth = function() {
  const currentMonth = new Date().getMonth() + 1;
  return this.find({
    $expr: {
      $eq: [{ $month: '$hireDate' }, currentMonth]
    },
    status: 'Active'
  });
};

module.exports = mongoose.model('Employee', employeeSchema); 