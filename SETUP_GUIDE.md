# 🚀 Complete HR System Setup Guide

Your HR system is now fully operational! Here's how to configure everything and start using it with real data.

## ✅ **System Status: FULLY OPERATIONAL**

- **Backend**: Running on http://localhost:5001
- **Frontend**: Running on http://localhost:3001
- **Authentication**: Working with demo credentials

## 🔐 **Login Credentials**

- **Email**: admin@example.com
- **Password**: password123

## 📧 **Email Configuration Setup**

### Step 1: Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "HR System"
   - Copy the generated 16-character password

### Step 2: Configure Email Settings

1. **Login to the HR System** at http://localhost:3001
2. **Go to Settings** (gear icon in sidebar)
3. **Email Configuration Section**:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP Username: your-email@gmail.com
   SMTP Password: [Your 16-character app password]
   Company Email: hr@yourcompany.com
   Company Name: Your Company Name
   ```
4. **Click "Save Email Settings"**
5. **Click "Test Connection"** to verify

### Step 3: Test Email Functionality

1. **Go to Emails page**
2. **Click "Send Test Email"**
3. **Check your inbox** for the test email

## 📊 **Google Sheets Integration Setup**

### Step 1: Google Cloud Project Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project: `hr-process-automation`

2. **Enable APIs**:
   - Google Drive API
   - Google Sheets API
   - Google Docs API

3. **Create Service Account**:
   - IAM & Admin → Service Accounts
   - Create: `hr-process-automation`
   - Grant "Editor" role
   - Download JSON credentials

### Step 2: Configure Google Settings

1. **In HR System Settings**:
   ```
   Client ID: [From service account JSON]
   Client Secret: [From service account JSON]
   Spreadsheet ID: [Your Google Sheet ID]
   Folder ID: [Your Google Drive folder ID]
   ```

2. **Share your Google Sheet** with the service account email

### Step 3: Test Google Integration

1. **Go to Documents page**
2. **Click "Sync with Google Sheets"**
3. **Verify data appears in your Google Sheet**

## 👥 **Employee Management Testing**

### Add Real Employees

1. **Go to Employees page**
2. **Click "Add Employee"**
3. **Fill in employee details**:
   ```
   First Name: João
   Last Name: Silva
   Email: joao.silva@empresa.com
   CPF: 12345678901
   Employee ID: EMP001
   Department: TI
   Position: Desenvolvedor Full Stack
   Hire Date: 2023-01-15
   Employment Type: CLT
   Base Salary: 8500
   Phone: (11) 99999-9999
   Status: Active
   Work Schedule: Monday-Friday
   ```

### Test Employee Features

- ✅ **Add/Edit/Delete employees**
- ✅ **Search and filter employees**
- ✅ **Export employee data**
- ✅ **View employee statistics**

## 💰 **Payroll System Testing**

### Create Payroll Records

1. **Go to Payroll page**
2. **Click "Create Payroll"**
3. **Select employee and period**
4. **System will calculate**:
   - Base salary
   - Benefits (VT/VR, health, etc.)
   - Deductions (taxes, insurance)
   - Net salary

### Test Payroll Features

- ✅ **Automatic calculations**
- ✅ **Email notifications**
- ✅ **PDF generation**
- ✅ **Google Sheets export**

## 📄 **Document Management Testing**

### Upload Documents

1. **Go to Documents page**
2. **Click "Upload Document"**
3. **Select file** (PDF, DOC, XLS, etc.)
4. **Add metadata**:
   - Category: Contracts, Invoices, Reports
   - Employee association
   - Description

### Test Document Features

- ✅ **File upload/download**
- ✅ **Google Drive sync**
- ✅ **Document categorization**
- ✅ **Search and filter**

## 📧 **Email Automation Testing**

### Test Email Templates

1. **Go to Emails page**
2. **Select template**:
   - Welcome emails
   - Payroll notifications
   - Invoice requests
   - Document reminders

3. **Configure recipients**
4. **Send test emails**

### Automated Email Triggers

- ✅ **New employee welcome email**
- ✅ **Monthly payroll notifications**
- ✅ **Invoice request reminders**
- ✅ **Document expiry alerts**

## ⚡ **Automation Workflows Testing**

### Enable Automations

1. **Go to Automation page**
2. **Toggle automations**:
   - Email notifications
   - Document processing
   - Payroll calculations
   - Data backups

### Test Workflow Triggers

- ✅ **Employee onboarding workflow**
- ✅ **Monthly payroll processing**
- ✅ **Document expiry checks**
- ✅ **Google Sheets sync**

## 🔧 **Advanced Configuration**

### Environment Variables

Create `.env` file in server directory:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
COMPANY_EMAIL=hr@yourcompany.com
COMPANY_NAME=Your Company Name

# Google Configuration
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_FOLDER_ID=your-folder-id

# Database (optional)
MONGODB_URI=your-mongodb-uri
```

### Custom Email Templates

Edit `server/utils/emailService.js` to customize:
- Welcome email template
- Payroll notification template
- Invoice request template
- Document reminder template

## 🧪 **Testing Checklist**

### Core Features
- [ ] User authentication and login
- [ ] Employee CRUD operations
- [ ] Payroll calculations and processing
- [ ] Document upload and management
- [ ] Email sending and templates
- [ ] Google Sheets integration
- [ ] Automation workflows

### Advanced Features
- [ ] Bulk email sending
- [ ] Data export to Excel/PDF
- [ ] Google Drive file sync
- [ ] Automated payroll processing
- [ ] Document expiry notifications
- [ ] Employee onboarding workflow

## 🚨 **Troubleshooting**

### Email Issues
- **Check Gmail app password** is correct
- **Verify 2FA is enabled** on Gmail
- **Test connection** in Settings page
- **Check firewall** allows SMTP traffic

### Google Sheets Issues
- **Verify service account** has access
- **Check API quotas** in Google Cloud Console
- **Ensure spreadsheet** is shared with service account
- **Test connection** in Settings page

### General Issues
- **Restart server**: `npm run dev`
- **Clear browser cache**
- **Check browser console** for errors
- **Verify all dependencies** are installed

## 📞 **Support**

If you encounter any issues:

1. **Check the terminal** for error messages
2. **Review browser console** for frontend errors
3. **Verify all configurations** are correct
4. **Test individual components** step by step

## 🎉 **You're Ready!**

Your HR system is now fully configured and ready for production use. You can:

- ✅ Manage employees with full CRUD operations
- ✅ Process payroll with automatic calculations
- ✅ Send automated emails with professional templates
- ✅ Sync data with Google Sheets
- ✅ Upload and manage documents
- ✅ Run automated workflows

**Start using your HR system at: http://localhost:3001** 