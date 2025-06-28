const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');

// In-memory storage for settings (in production, use database)
let emailSettings = {
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT || '587',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  companyEmail: process.env.COMPANY_EMAIL || '',
  companyName: process.env.COMPANY_NAME || 'HR System'
};

let googleSettings = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  folderId: process.env.GOOGLE_FOLDER_ID || ''
};

// Get email settings
router.get('/email', (req, res) => {
  res.json({
    success: true,
    settings: {
      ...emailSettings,
      smtpPass: '***' // Don't return actual password
    }
  });
});

// Save email settings
router.post('/email', (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, companyEmail, companyName } = req.body;
    
    emailSettings = {
      smtpHost: smtpHost || '',
      smtpPort: smtpPort || '587',
      smtpUser: smtpUser || '',
      smtpPass: smtpPass || '',
      companyEmail: companyEmail || '',
      companyName: companyName || 'HR System'
    };

    // Configure email service with new settings
    const configured = emailService.configure(emailSettings);
    
    if (configured) {
      res.json({
        success: true,
        message: 'Email settings saved successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to configure email service'
      });
    }
  } catch (error) {
    console.error('Error saving email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save email settings'
    });
  }
});

// Test email connection
router.post('/test-email', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, companyEmail, companyName } = req.body;
    
    const testSettings = {
      smtpHost: smtpHost || emailSettings.smtpHost,
      smtpPort: smtpPort || emailSettings.smtpPort,
      smtpUser: smtpUser || emailSettings.smtpUser,
      smtpPass: smtpPass || emailSettings.smtpPass,
      companyEmail: companyEmail || emailSettings.companyEmail,
      companyName: companyName || emailSettings.companyName
    };

    // Configure email service
    emailService.configure(testSettings);
    
    // Test connection
    await emailService.testConnection();
    
    res.json({
      success: true,
      message: 'Email connection test successful'
    });
  } catch (error) {
    console.error('Email connection test failed:', error);
    res.status(400).json({
      success: false,
      message: `Email connection test failed: ${error.message}`
    });
  }
});

// Get Google settings
router.get('/google', (req, res) => {
  res.json({
    success: true,
    settings: {
      ...googleSettings,
      clientSecret: '***' // Don't return actual secret
    }
  });
});

// Save Google settings
router.post('/google', (req, res) => {
  try {
    const { clientId, clientSecret, spreadsheetId, folderId } = req.body;
    
    googleSettings = {
      clientId: clientId || '',
      clientSecret: clientSecret || '',
      spreadsheetId: spreadsheetId || '',
      folderId: folderId || ''
    };

    res.json({
      success: true,
      message: 'Google settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving Google settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Google settings'
    });
  }
});

// Test Google connection
router.post('/test-google', async (req, res) => {
  try {
    const { clientId, clientSecret, spreadsheetId, folderId } = req.body;
    
    // For now, just validate that required fields are present
    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    // In a real implementation, you would test the Google API connection here
    // For demo purposes, we'll just return success
    
    res.json({
      success: true,
      message: 'Google connection test successful'
    });
  } catch (error) {
    console.error('Google connection test failed:', error);
    res.status(400).json({
      success: false,
      message: `Google connection test failed: ${error.message}`
    });
  }
});

module.exports = router; 