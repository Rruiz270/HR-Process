const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    trim: true
  },

  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Role and Permissions
  role: {
    type: String,
    enum: ['Admin', 'HR', 'Manager', 'Employee', 'Finance'],
    default: 'Employee'
  },
  permissions: [{
    type: String,
    enum: [
      'view_employees', 'create_employees', 'edit_employees', 'delete_employees',
      'view_payroll', 'create_payroll', 'edit_payroll', 'approve_payroll',
      'view_documents', 'upload_documents', 'delete_documents',
      'send_emails', 'manage_automation', 'view_reports', 'manage_users',
      'access_google_drive', 'manage_benefits'
    ]
  }],

  // Department and Position
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
    ref: 'User'
  },

  // Employee reference (if user is also an employee)
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // Profile
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500
  },

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'pt-BR'],
      default: 'pt-BR'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },

  // Security
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,

  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Deleted'],
    default: 'Active'
  },
  isOnline: {
    type: Boolean,
    default: false
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'preferences.language': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.fullName;
});

// Virtual for is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to hash password
userSchema.methods.hashPassword = async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing password');
  }
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'Admin';
};

// Method to check role
userSchema.methods.hasRole = function(role) {
  return this.role === role || this.role === 'Admin';
};

// Method to get all permissions for role
userSchema.methods.getRolePermissions = function() {
  const rolePermissions = {
    Admin: [
      'view_employees', 'create_employees', 'edit_employees', 'delete_employees',
      'view_payroll', 'create_payroll', 'edit_payroll', 'approve_payroll',
      'view_documents', 'upload_documents', 'delete_documents',
      'send_emails', 'manage_automation', 'view_reports', 'manage_users',
      'access_google_drive', 'manage_benefits'
    ],
    HR: [
      'view_employees', 'create_employees', 'edit_employees',
      'view_payroll', 'create_payroll', 'edit_payroll',
      'view_documents', 'upload_documents',
      'send_emails', 'view_reports',
      'access_google_drive', 'manage_benefits'
    ],
    Manager: [
      'view_employees', 'edit_employees',
      'view_payroll', 'approve_payroll',
      'view_documents', 'upload_documents',
      'send_emails', 'view_reports'
    ],
    Finance: [
      'view_employees',
      'view_payroll', 'create_payroll', 'edit_payroll', 'approve_payroll',
      'view_documents', 'upload_documents',
      'view_reports'
    ],
    Employee: [
      'view_employees',
      'view_payroll',
      'view_documents'
    ]
  };
  
  return rolePermissions[this.role] || [];
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, status: 'Active' });
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department, status: 'Active' });
};

// Static method to find online users
userSchema.statics.findOnline = function() {
  return this.find({ isOnline: true, status: 'Active' });
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    await this.hashPassword();
  }
  next();
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this.permissions.length === 0) {
    this.permissions = this.getRolePermissions();
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 