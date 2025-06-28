const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  // Document identification
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  documentType: {
    type: String,
    required: true,
    enum: [
      'Invoice', 'Contract', 'ID', 'CPF', 'WorkCard', 'TaxDocument', 
      'Payroll', 'Benefits', 'Policy', 'Training', 'Performance', 'Other'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: ['Employee', 'Payroll', 'Benefits', 'Compliance', 'General']
  },

  // File information
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },

  // Document metadata
  tags: [{
    type: String,
    trim: true
  }],
  keywords: [{
    type: String,
    trim: true
  }],

  // Related entities
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  payroll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll'
  },
  relatedDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],

  // Invoice specific fields (for NFE documents)
  invoice: {
    invoiceNumber: String,
    invoiceDate: Date,
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Received', 'Paid', 'Overdue'],
      default: 'Pending'
    },
    supplier: {
      name: String,
      cnpj: String,
      email: String
    },
    recipient: {
      name: String,
      cpf: String,
      email: String
    }
  },

  // Document lifecycle
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Archived', 'Expired', 'Deleted'],
    default: 'Active'
  },
  expiryDate: Date,
  isConfidential: {
    type: Boolean,
    default: false
  },
  isRequired: {
    type: Boolean,
    default: false
  },

  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },

  // Access control
  accessLevel: {
    type: String,
    enum: ['Public', 'HR Only', 'Manager', 'Employee', 'Admin'],
    default: 'HR Only'
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Audit trail
  uploadDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 0
  },

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

// Indexes for better query performance
documentSchema.index({ documentType: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ employee: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ expiryDate: 1 });
documentSchema.index({ uploadDate: -1 });

// Text index for search functionality
documentSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  keywords: 'text'
});

// Virtual for document age
documentSchema.virtual('age').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.uploadDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for file size in human readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.fileSize === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for expiry status
documentSchema.virtual('expiryStatus').get(function() {
  if (!this.expiryDate) return 'No Expiry';
  const now = new Date();
  const diffTime = this.expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Expired';
  if (diffDays <= 30) return 'Expiring Soon';
  return 'Valid';
});

// Method to check if document is accessible by user
documentSchema.methods.isAccessibleBy = function(userId, userRole) {
  // Admin can access everything
  if (userRole === 'Admin') return true;
  
  // Check if user is in allowed users list
  if (this.allowedUsers.includes(userId)) return true;
  
  // Check access level
  switch (this.accessLevel) {
    case 'Public':
      return true;
    case 'HR Only':
      return ['HR', 'Admin'].includes(userRole);
    case 'Manager':
      return ['Manager', 'HR', 'Admin'].includes(userRole);
    case 'Employee':
      return true; // All authenticated users
    default:
      return false;
  }
};

// Method to increment access count
documentSchema.methods.incrementAccess = function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Static method to find documents by type
documentSchema.statics.findByType = function(documentType) {
  return this.find({ documentType, status: 'Active' });
};

// Static method to find expired documents
documentSchema.statics.findExpired = function() {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: 'Active'
  });
};

// Static method to find documents expiring soon
documentSchema.statics.findExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiryDate: { 
      $gte: new Date(),
      $lte: futureDate 
    },
    status: 'Active'
  });
};

// Static method to search documents
documentSchema.statics.search = function(query) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware to update lastModified
documentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema); 