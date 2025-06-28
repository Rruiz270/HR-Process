# 🚀 HR System Testing Guide

Your HR system is now running! Here's how to test all features with real data.

## 📋 Quick Start

### 1. **Run the Test Script**
```bash
node test-data-setup.js
```

This will:
- ✅ Create 3 test employees (CLT and PJ)
- ✅ Create sample payroll data
- ✅ Test email functionality
- ✅ Test Google Drive integration

### 2. **View Data in UI**
Visit: http://localhost:3001
- Login: `admin@example.com` / `password123`
- Navigate to Employees, Payroll, etc.

## 📧 Email Testing Setup

### Configure Email Settings
Add to your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
COMPANY_EMAIL=hr@yourcompany.com
```

### Gmail App Password Setup
1. Go to Google Account Settings
2. Security > 2-Step Verification > App passwords
3. Generate app password for "Mail"
4. Use this password in SMTP_PASS

### Test Email Types Available
1. **Invoice Request** (for PJ employees)
2. **Payroll Notification**
3. **Document Expiry Warning**
4. **Benefit Request Confirmation**

## 📊 Google Sheets Integration

### Setup Google Drive
1. Follow `google-sheets-setup.md` guide
2. Create service account
3. Download credentials JSON
4. Place in `server/config/google-credentials.json`

### Test Spreadsheet Operations
```bash
# List files
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/google-drive/files

# Read spreadsheet
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/google-drive/sheets/YOUR_SPREADSHEET_ID"
```

## 🔧 Manual API Testing

### 1. **Employee Management**
```bash
# Get all employees
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/employees

# Create employee
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ana",
    "lastName": "Costa",
    "email": "ana.costa@empresa.com",
    "cpf": "11122233344",
    "employeeId": "EMP004",
    "department": "Marketing",
    "position": "Designer",
    "hireDate": "2024-01-15",
    "employmentType": "CLT",
    "baseSalary": 7000
  }' \
  http://localhost:5001/api/employees
```

### 2. **Payroll Management**
```bash
# Get all payrolls
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/payroll

# Create payroll
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID_HERE",
    "payrollPeriod": "2024-01-01",
    "baseSalary": 7000,
    "benefits": [
      {"type": "Vale Refeição", "value": 600},
      {"type": "Vale Transporte", "value": 300}
    ],
    "deductions": [
      {"type": "INSS", "value": 700},
      {"type": "IRRF", "value": 1000}
    ],
    "paymentMethod": "PIX",
    "status": "Processed"
  }' \
  http://localhost:5001/api/payroll
```

### 3. **Email Testing**
```bash
# Send invoice request
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID_HERE",
    "payrollId": "PAYROLL_ID_HERE",
    "customMessage": "Teste de solicitação de nota fiscal"
  }' \
  http://localhost:5001/api/email/invoice-request

# Send payroll notification
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payrollId": "PAYROLL_ID_HERE",
    "includeDetails": true
  }' \
  http://localhost:5001/api/email/payroll-notification
```

## 📁 Document Management

### Upload Documents
```bash
# Upload to Google Drive
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "employee_contract.pdf",
    "parentFolderId": "FOLDER_ID_HERE",
    "filePath": "/path/to/local/file.pdf"
  }' \
  http://localhost:5001/api/google-drive/upload
```

## 🔄 Automation Testing

### Scheduled Tasks
The system includes automated tasks:
- Document expiry notifications
- Payroll processing reminders
- Email automation

### Test Automation
```bash
# Trigger automation manually
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/automation/trigger
```

## 📈 Data Import/Export

### Import from Spreadsheet
1. Create Google Sheets with employee data
2. Use the import function in the test script
3. Verify data in UI

### Export to Spreadsheet
```bash
# Export payroll data
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "YOUR_SPREADSHEET_ID",
    "range": "A2:G10",
    "values": [["EMP001", "João", "Silva", "2024-01", "8500", "7550", "Processed"]]
  }' \
  http://localhost:5001/api/google-drive/sheets/YOUR_SPREADSHEET_ID/write
```

## 🧪 Testing Scenarios

### Scenario 1: Complete Employee Lifecycle
1. Create new employee
2. Generate payroll
3. Send payroll notification email
4. Upload documents to Drive
5. Update employee information
6. Generate invoice request (for PJ)

### Scenario 2: Bulk Operations
1. Import 10+ employees from spreadsheet
2. Process payroll for all
3. Send bulk email notifications
4. Export results to spreadsheet

### Scenario 3: Document Management
1. Upload employee contracts
2. Set expiry dates
3. Test expiry notifications
4. Download documents

## 🔍 Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP settings
- Verify Gmail app password
- Check firewall/network

**Google Drive errors:**
- Verify credentials file path
- Check service account permissions
- Ensure APIs are enabled

**API errors:**
- Check authentication token
- Verify request format
- Check server logs

### Debug Commands
```bash
# Check server status
curl http://localhost:5001/api/health

# Check authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/auth/me

# View server logs
tail -f server/logs/app.log
```

## 🎯 Next Steps

1. **Configure Real Email**: Set up your actual email credentials
2. **Set Up Google Drive**: Follow the Google Sheets setup guide
3. **Add Real Data**: Import your actual employee data
4. **Customize Templates**: Modify email templates for your needs
5. **Set Up Automation**: Configure scheduled tasks
6. **Security Review**: Review and tighten security settings

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Verify all configurations
4. Test with the provided test script

Your HR system is now ready for production use! 🎉 