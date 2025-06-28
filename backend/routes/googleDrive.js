const express = require('express');
const { google } = require('googleapis');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Configure Google Auth
const getGoogleAuth = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../config/google-credentials.json'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents'
    ]
  });
  return auth;
};

// Get Google Drive service
const getDriveService = async () => {
  const auth = await getGoogleAuth();
  return google.drive({ version: 'v3', auth });
};

// Get Google Sheets service
const getSheetsService = async () => {
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
};

// Get Google Docs service
const getDocsService = async () => {
  const auth = await getGoogleAuth();
  return google.docs({ version: 'v1', auth });
};

// List files from Google Drive
router.get('/files', auth, async (req, res) => {
  try {
    const { q, pageSize = 10, pageToken } = req.query;
    
    const drive = await getDriveService();
    const response = await drive.files.list({
      pageSize: parseInt(pageSize),
      pageToken,
      q: q || "trashed=false",
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)'
    });

    res.json({
      files: response.data.files,
      nextPageToken: response.data.nextPageToken
    });
  } catch (error) {
    console.error('List Google Drive files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file details
router.get('/files/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const drive = await getDriveService();
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, webContentLink'
    });

    res.json(response.data);
  } catch (error) {
    console.error('Get Google Drive file error:', error);
    res.status(500).json({ error: 'Failed to get file details' });
  }
});

// Download file from Google Drive
router.get('/files/:fileId/download', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const drive = await getDriveService();
    const file = await drive.files.get({
      fileId,
      fields: 'name, mimeType'
    });

    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    res.setHeader('Content-Type', file.data.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.data.name}"`);
    
    response.data.pipe(res);
  } catch (error) {
    console.error('Download Google Drive file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Upload file to Google Drive
router.post('/upload', auth, authorize('Admin', 'HR'), [
  body('name').trim().notEmpty().withMessage('File name is required'),
  body('parentFolderId').optional().isString(),
  body('filePath').trim().notEmpty().withMessage('File path is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, parentFolderId, filePath } = req.body;

    // Check if file exists locally
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found locally' });
    }

    const drive = await getDriveService();
    
    const fileMetadata = {
      name: name,
      parents: parentFolderId ? [parentFolderId] : undefined
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    res.json({
      message: 'File uploaded successfully',
      file: response.data
    });
  } catch (error) {
    console.error('Upload to Google Drive error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Read Google Sheets
router.get('/sheets/:spreadsheetId', auth, async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const { range, sheetName } = req.query;
    
    const sheets = await getSheetsService();
    
    // Get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [],
      includeGridData: false
    });

    // Read data from specified range or sheet
    const dataRange = range || (sheetName ? `${sheetName}!A:Z` : 'A:Z');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange
    });

    res.json({
      spreadsheet: metadata.data,
      data: response.data.values || [],
      range: dataRange
    });
  } catch (error) {
    console.error('Read Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to read spreadsheet' });
  }
});

// Write to Google Sheets
router.post('/sheets/:spreadsheetId/write', auth, authorize('Admin', 'HR'), [
  body('range').trim().notEmpty().withMessage('Range is required'),
  body('values').isArray().withMessage('Values array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { spreadsheetId } = req.params;
    const { range, values } = req.body;

    const sheets = await getSheetsService();
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    res.json({
      message: 'Data written successfully',
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells
    });
  } catch (error) {
    console.error('Write to Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to write to spreadsheet' });
  }
});

// Append to Google Sheets
router.post('/sheets/:spreadsheetId/append', auth, authorize('Admin', 'HR'), [
  body('range').trim().notEmpty().withMessage('Range is required'),
  body('values').isArray().withMessage('Values array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { spreadsheetId } = req.params;
    const { range, values } = req.body;

    const sheets = await getSheetsService();
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: values
      }
    });

    res.json({
      message: 'Data appended successfully',
      updatedRange: response.data.updates.updatedRange,
      updatedRows: response.data.updates.updatedRows,
      updatedColumns: response.data.updates.updatedColumns,
      updatedCells: response.data.updates.updatedCells
    });
  } catch (error) {
    console.error('Append to Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to append to spreadsheet' });
  }
});

// Create new spreadsheet
router.post('/sheets/create', auth, authorize('Admin', 'HR'), [
  body('title').trim().notEmpty().withMessage('Spreadsheet title is required'),
  body('sheets').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, sheets = [{ title: 'Sheet1' }] } = req.body;

    const sheetsService = await getSheetsService();
    
    const response = await sheetsService.spreadsheets.create({
      requestBody: {
        properties: {
          title: title
        },
        sheets: sheets.map(sheet => ({ properties: { title: sheet.title } }))
      }
    });

    res.json({
      message: 'Spreadsheet created successfully',
      spreadsheet: response.data
    });
  } catch (error) {
    console.error('Create Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to create spreadsheet' });
  }
});

// Export payroll data to Google Sheets
router.post('/sheets/export-payroll', auth, authorize('Admin', 'HR'), [
  body('payrollIds').isArray().withMessage('Payroll IDs array is required'),
  body('spreadsheetId').optional().isString(),
  body('sheetName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payrollIds, spreadsheetId, sheetName = 'Payroll Data' } = req.body;

    // Import Payroll model
    const Payroll = require('../models/Payroll');
    
    // Get payroll data
    const payrolls = await Payroll.find({ _id: { $in: payrollIds } })
      .populate('employee', 'firstName lastName employeeId department');

    if (payrolls.length === 0) {
      return res.status(404).json({ error: 'No payroll records found' });
    }

    // Prepare data for spreadsheet
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Payroll Period',
      'Base Salary',
      'Total Benefits',
      'Total Deductions',
      'Total Amount',
      'Status',
      'Payment Method'
    ];

    const data = payrolls.map(payroll => [
      payroll.employee.employeeId,
      `${payroll.employee.firstName} ${payroll.employee.lastName}`,
      payroll.employee.department,
      new Date(payroll.payrollPeriod).toLocaleDateString(),
      payroll.baseSalary,
      Object.values(payroll.benefits)
        .filter(benefit => benefit.enabled)
        .reduce((sum, benefit) => sum + benefit.value, 0),
      (payroll.deductions || [])
        .reduce((sum, deduction) => sum + deduction.amount, 0),
      payroll.total,
      payroll.status,
      payroll.paymentMethod
    ]);

    const values = [headers, ...data];

    const sheets = await getSheetsService();
    
    let targetSpreadsheetId = spreadsheetId;
    
    // Create new spreadsheet if not provided
    if (!targetSpreadsheetId) {
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Payroll Export - ${new Date().toLocaleDateString()}`
          },
          sheets: [{ properties: { title: sheetName } }]
        }
      });
      targetSpreadsheetId = createResponse.data.spreadsheetId;
    }

    // Write data to spreadsheet
    const writeResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: targetSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    res.json({
      message: 'Payroll data exported successfully',
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`,
      updatedRange: writeResponse.data.updatedRange,
      updatedRows: writeResponse.data.updatedRows
    });
  } catch (error) {
    console.error('Export payroll to Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to export payroll data' });
  }
});

// Export employee data to Google Sheets
router.post('/sheets/export-employees', auth, authorize('Admin', 'HR'), [
  body('employeeIds').optional().isArray(),
  body('spreadsheetId').optional().isString(),
  body('sheetName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeIds, spreadsheetId, sheetName = 'Employee Data' } = req.body;

    // Import Employee model
    const Employee = require('../models/Employee');
    
    // Get employee data
    const filter = employeeIds ? { _id: { $in: employeeIds } } : {};
    const employees = await Employee.find(filter).populate('manager', 'firstName lastName');

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No employee records found' });
    }

    // Prepare data for spreadsheet
    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Email',
      'Department',
      'Position',
      'Employment Type',
      'Status',
      'Hire Date',
      'Base Salary',
      'Manager'
    ];

    const data = employees.map(employee => [
      employee.employeeId,
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.department,
      employee.position,
      employee.employmentType,
      employee.status,
      new Date(employee.hireDate).toLocaleDateString(),
      employee.baseSalary,
      employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : ''
    ]);

    const values = [headers, ...data];

    const sheets = await getSheetsService();
    
    let targetSpreadsheetId = spreadsheetId;
    
    // Create new spreadsheet if not provided
    if (!targetSpreadsheetId) {
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Employee Export - ${new Date().toLocaleDateString()}`
          },
          sheets: [{ properties: { title: sheetName } }]
        }
      });
      targetSpreadsheetId = createResponse.data.spreadsheetId;
    }

    // Write data to spreadsheet
    const writeResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: targetSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    res.json({
      message: 'Employee data exported successfully',
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`,
      updatedRange: writeResponse.data.updatedRange,
      updatedRows: writeResponse.data.updatedRows
    });
  } catch (error) {
    console.error('Export employees to Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to export employee data' });
  }
});

// Get Google Drive storage info
router.get('/storage', auth, async (req, res) => {
  try {
    const drive = await getDriveService();
    
    // Get about information (includes storage quota)
    const response = await drive.about.get({
      fields: 'storageQuota'
    });

    res.json(response.data.storageQuota);
  } catch (error) {
    console.error('Get Google Drive storage error:', error);
    res.status(500).json({ error: 'Failed to get storage information' });
  }
});

// Search files in Google Drive
router.get('/search', auth, async (req, res) => {
  try {
    const { q, mimeType, pageSize = 10, pageToken } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const drive = await getDriveService();
    
    let searchQuery = `name contains '${q}' and trashed=false`;
    if (mimeType) {
      searchQuery += ` and mimeType='${mimeType}'`;
    }

    const response = await drive.files.list({
      q: searchQuery,
      pageSize: parseInt(pageSize),
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)'
    });

    res.json({
      files: response.data.files,
      nextPageToken: response.data.nextPageToken
    });
  } catch (error) {
    console.error('Search Google Drive error:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

module.exports = router; 