# Google Sheets Integration Setup Guide

## 1. Set Up Google Cloud Project

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
   - Google Docs API

### Step 2: Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `hr-process-automation`
4. Description: `Service account for HR process automation`
5. Click "Create and Continue"
6. Grant "Editor" role
7. Click "Done"

### Step 3: Generate Credentials
1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file
6. Save it as `google-credentials.json` in `server/config/` folder

## 2. Configure Environment Variables

Add to your `.env` file:
```env
GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json
```

## 3. Test Spreadsheet Setup

### Create Test Spreadsheet
1. Create a new Google Sheets document
2. Add the service account email as an editor
3. Create sample data:

| Employee ID | First Name | Last Name | Email | Department | Position | Salary |
|-------------|------------|-----------|-------|------------|----------|--------|
| EMP001 | João | Silva | joao.silva@empresa.com | TI | Desenvolvedor | 8500 |
| EMP002 | Maria | Santos | maria.santos@empresa.com | RH | Analista | 6500 |
| EMP003 | Pedro | Oliveira | pedro.oliveira@empresa.com | Vendas | Vendedor | 12000 |

### Set Spreadsheet ID
Copy the spreadsheet ID from the URL and set it as environment variable:
```env
TEST_SPREADSHEET_ID=your-spreadsheet-id-here
```

## 4. API Endpoints for Spreadsheet Operations

### Read Spreadsheet Data
```bash
GET /api/google-drive/sheets/{spreadsheetId}
```

### Write to Spreadsheet
```bash
POST /api/google-drive/sheets/{spreadsheetId}/write
{
  "range": "A2:G4",
  "values": [
    ["EMP004", "Ana", "Costa", "ana.costa@empresa.com", "Marketing", "Designer", "7000"],
    ["EMP005", "Carlos", "Lima", "carlos.lima@empresa.com", "Finance", "Analista", "8000"]
  ]
}
```

### Upload Files to Drive
```bash
POST /api/google-drive/upload
{
  "name": "employee_report.pdf",
  "parentFolderId": "optional-folder-id",
  "filePath": "/path/to/local/file.pdf"
}
```

## 5. Automation Examples

### Import Employees from Spreadsheet
```javascript
const importEmployeesFromSheet = async (spreadsheetId, token) => {
  try {
    // Read spreadsheet data
    const response = await axios.get(`${API_BASE}/google-drive/sheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const rows = response.data.data.slice(1); // Skip header row
    
    // Create employees
    for (const row of rows) {
      const employeeData = {
        employeeId: row[0],
        firstName: row[1],
        lastName: row[2],
        email: row[3],
        department: row[4],
        position: row[5],
        baseSalary: parseFloat(row[6]),
        // Add other required fields
        cpf: '00000000000', // Generate or get from sheet
        hireDate: new Date().toISOString().split('T')[0],
        employmentType: 'CLT',
        status: 'Active'
      };
      
      await createEmployee(employeeData, token);
    }
    
    console.log(`✅ Imported ${rows.length} employees from spreadsheet`);
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
};
```

### Export Payroll Data to Spreadsheet
```javascript
const exportPayrollToSheet = async (spreadsheetId, payrollData, token) => {
  try {
    const values = payrollData.map(payroll => [
      payroll.employee.employeeId,
      payroll.employee.firstName,
      payroll.employee.lastName,
      payroll.payrollPeriod,
      payroll.baseSalary,
      payroll.total,
      payroll.status
    ]);
    
    await axios.post(`${API_BASE}/google-drive/sheets/${spreadsheetId}/write`, {
      range: 'A2:G' + (values.length + 1),
      values: values
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Payroll data exported to spreadsheet');
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
};
```

## 6. Security Best Practices

1. **Restrict Service Account Permissions**: Only grant necessary permissions
2. **Use Specific Folders**: Create dedicated folders for HR data
3. **Regular Credential Rotation**: Update credentials periodically
4. **Audit Access**: Monitor service account usage
5. **Data Encryption**: Ensure sensitive data is encrypted

## 7. Troubleshooting

### Common Issues:
1. **403 Forbidden**: Check service account permissions
2. **404 Not Found**: Verify spreadsheet ID and sharing settings
3. **Invalid Credentials**: Ensure JSON file path is correct
4. **Quota Exceeded**: Monitor API usage limits

### Debug Commands:
```bash
# Test credentials
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/google-drive/files

# Test spreadsheet access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/google-drive/sheets/YOUR_SPREADSHEET_ID"
``` 