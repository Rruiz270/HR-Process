const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const { auth, authorize } = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get all documents with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      relatedEntity, 
      relatedEntityId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (relatedEntity) filter.relatedEntity = relatedEntity;
    if (relatedEntityId) filter.relatedEntityId = relatedEntityId;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const documents = await Document.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('relatedEntityId', 'firstName lastName employeeId')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get document by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('relatedEntityId', 'firstName lastName employeeId');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload new document
router.post('/', auth, upload.single('file'), [
  body('name').trim().notEmpty().withMessage('Document name is required'),
  body('type').isIn(['ID', 'CPF', 'WorkCard', 'Contract', 'TaxDocument', 'Invoice', 'Receipt', 'Other']).withMessage('Valid document type is required'),
  body('description').optional().trim(),
  body('tags').optional().isArray(),
  body('relatedEntity').optional().isIn(['Employee', 'Payroll', 'User']),
  body('relatedEntityId').optional().isMongoId(),
  body('expiryDate').optional().isISO8601(),
  body('accessLevel').optional().isIn(['Public', 'Private', 'Restricted'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const documentData = {
      name: req.body.name,
      type: req.body.type,
      description: req.body.description,
      tags: req.body.tags || [],
      relatedEntity: req.body.relatedEntity,
      relatedEntityId: req.body.relatedEntityId,
      expiryDate: req.body.expiryDate,
      accessLevel: req.body.accessLevel || 'Private',
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      createdBy: req.user._id
    };

    const document = new Document(documentData);
    await document.save();

    const populatedDocument = await Document.findById(document._id)
      .populate('createdBy', 'firstName lastName')
      .populate('relatedEntityId', 'firstName lastName employeeId');

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: populatedDocument
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download document
router.get('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (document.accessLevel === 'Private' && 
        document.createdBy.toString() !== req.user._id.toString() &&
        !['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = document.fileInfo.path;
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, document.fileInfo.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update document metadata
router.put('/:id', auth, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['Active', 'Archived', 'Expired']),
  body('accessLevel').optional().isIn(['Public', 'Private', 'Restricted']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (document.createdBy.toString() !== req.user._id.toString() && 
        !['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = { ...req.body, updatedBy: req.user._id };

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .populate('relatedEntityId', 'firstName lastName employeeId');

    res.json({
      message: 'Document updated successfully',
      document: updatedDocument
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (document.createdBy.toString() !== req.user._id.toString() && 
        !['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.fileInfo.path);
    } catch (error) {
      console.warn('Could not delete file from filesystem:', error);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get documents by type
router.get('/type/:type', auth, async (req, res) => {
  try {
    const documents = await Document.find({ type: req.params.type })
      .populate('createdBy', 'firstName lastName')
      .populate('relatedEntityId', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get documents by type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get documents by related entity
router.get('/entity/:entity/:entityId', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      relatedEntity: req.params.entity,
      relatedEntityId: req.params.entityId
    })
    .populate('createdBy', 'firstName lastName')
    .populate('relatedEntityId', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get documents by entity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expired documents
router.get('/expired/list', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      expiryDate: { $lt: new Date() },
      status: { $ne: 'Expired' }
    })
    .populate('createdBy', 'firstName lastName')
    .populate('relatedEntityId', 'firstName lastName employeeId')
    .sort({ expiryDate: 1 });

    res.json(documents);
  } catch (error) {
    console.error('Get expired documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark document as expired
router.put('/:id/expire', auth, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Expired',
        updatedBy: req.user._id
      },
      { new: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      message: 'Document marked as expired',
      document
    });
  } catch (error) {
    console.error('Mark document expired error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get document statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Document.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'Archived'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Document.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const entityStats = await Document.aggregate([
      {
        $group: {
          _id: '$relatedEntity',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: stats[0] || { total: 0, active: 0, archived: 0, expired: 0 },
      byType: typeStats,
      byEntity: entityStats
    });
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk upload documents
router.post('/bulk-upload', auth, authorize('Admin', 'HR'), upload.array('files', 10), [
  body('documents').isArray().withMessage('Documents array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Files are required' });
    }

    const documents = req.body.documents;
    const uploadedDocuments = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const documentInfo = documents[i] || {};

      const documentData = {
        name: documentInfo.name || file.originalname,
        type: documentInfo.type || 'Other',
        description: documentInfo.description,
        tags: documentInfo.tags || [],
        relatedEntity: documentInfo.relatedEntity,
        relatedEntityId: documentInfo.relatedEntityId,
        expiryDate: documentInfo.expiryDate,
        accessLevel: documentInfo.accessLevel || 'Private',
        fileInfo: {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        },
        createdBy: req.user._id
      };

      const document = new Document(documentData);
      await document.save();
      uploadedDocuments.push(document);
    }

    res.status(201).json({
      message: `${uploadedDocuments.length} documents uploaded successfully`,
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 