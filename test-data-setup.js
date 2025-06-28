const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:3001/api';
const AUTH_TOKEN = ''; // Will be set after login

// Test data
const testEmployees = [
  {
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@empresa.com',
    cpf: '12345678901',
    employeeId: 'EMP001',
    department: 'TI',
    position: 'Desenvolvedor Full Stack',
    hireDate: '2023-01-15',
    employmentType: 'CLT',
    baseSalary: 8500,
    phone: '(11) 99999-9999',
    status: 'Active',
    workSchedule: 'Monday-Friday'
  },
  {
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@empresa.com',
    cpf: '98765432100',
    employeeId: 'EMP002',
    department: 'RH',
    position: 'Analista de Recursos Humanos',
    hireDate: '2023-03-20',
    employmentType: 'CLT',
    baseSalary: 6500,
    phone: '(11) 88888-8888',
    status: 'Active',
    workSchedule: 'Monday-Friday'
  },
  {
    firstName: 'Pedro',
    lastName: 'Oliveira',
    email: 'pedro.oliveira@empresa.com',
    cpf: '11122233344',
    employeeId: 'EMP003',
    department: 'Vendas',
    position: 'Vendedor Senior',
    hireDate: '2023-06-10',
    employmentType: 'PJ',
    baseSalary: 12000,
    phone: '(11) 77777-7777',
    status: 'Active',
    workSchedule: 'Monday-Saturday'
  }
];

const testPayrolls = [
  {
    employeeId: 'EMP001',
    payrollPeriod: '2024-01-01',
    baseSalary: 8500,
    benefits: [
      { type: 'Vale Refeição', value: 600 },
      { type: 'Vale Transporte', value: 300 },
      { type: 'Plano de Saúde', value: 400 }
    ],
    deductions: [
      { type: 'INSS', value: 850 },
      { type: 'IRRF', value: 1200 }
    ],
    total: 8500 + 600 + 300 + 400 - 850 - 1200,
    paymentMethod: 'PIX',
    status: 'Processed'
  }
];

// Helper functions
const login = async () => {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
};

const createEmployee = async (employeeData, token) => {
  try {
    const response = await axios.post(`${API_BASE}/employees`, employeeData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Employee created: ${employeeData.firstName} ${employeeData.lastName}`);
    return response.data.employee;
  } catch (error) {
    console.error(`❌ Failed to create employee ${employeeData.firstName}:`, error.response?.data || error.message);
    return null;
  }
};

const createPayroll = async (payrollData, token) => {
  try {
    const response = await axios.post(`${API_BASE}/payroll`, payrollData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Payroll created for period: ${payrollData.payrollPeriod}`);
    return response.data.payroll;
  } catch (error) {
    console.error(`❌ Failed to create payroll:`, error.response?.data || error.message);
    return null;
  }
};

const sendTestEmail = async (emailType, data, token) => {
  try {
    let endpoint, payload;
    
    switch (emailType) {
      case 'invoice-request':
        endpoint = `${API_BASE}/email/invoice-request`;
        payload = {
          employeeId: data.employeeId,
          payrollId: data.payrollId,
          customMessage: 'Teste de solicitação de nota fiscal'
        };
        break;
      case 'payroll-notification':
        endpoint = `${API_BASE}/email/payroll-notification`;
        payload = {
          payrollId: data.payrollId,
          includeDetails: true
        };
        break;
      default:
        console.error('Unknown email type:', emailType);
        return;
    }

    const response = await axios.post(endpoint, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ ${emailType} email sent successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send ${emailType} email:`, error.response?.data || error.message);
    return null;
  }
};

const testGoogleDriveIntegration = async (token) => {
  try {
    // List files
    const filesResponse = await axios.get(`${API_BASE}/google-drive/files`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Google Drive files listed:', filesResponse.data.files?.length || 0, 'files');
    
    // Test spreadsheet reading (if you have a test spreadsheet)
    if (process.env.TEST_SPREADSHEET_ID) {
      const sheetsResponse = await axios.get(`${API_BASE}/google-drive/sheets/${process.env.TEST_SPREADSHEET_ID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Google Sheets data read successfully');
    }
  } catch (error) {
    console.error('❌ Google Drive integration test failed:', error.response?.data || error.message);
  }
};

// Main testing function
const runTests = async () => {
  console.log('🚀 Starting HR System Testing...\n');

  // Step 1: Login
  console.log('1. Logging in...');
  const token = await login();
  if (!token) {
    console.error('❌ Login failed. Cannot proceed with tests.');
    return;
  }
  console.log('✅ Login successful\n');

  // Step 2: Create test employees
  console.log('2. Creating test employees...');
  const createdEmployees = [];
  for (const employeeData of testEmployees) {
    const employee = await createEmployee(employeeData, token);
    if (employee) {
      createdEmployees.push(employee);
    }
  }
  console.log(`✅ Created ${createdEmployees.length} employees\n`);

  // Step 3: Create test payrolls
  console.log('3. Creating test payrolls...');
  const createdPayrolls = [];
  for (const payrollData of testPayrolls) {
    // Find the employee ID from created employees
    const employee = createdEmployees.find(emp => emp.employeeId === payrollData.employeeId);
    if (employee) {
      const payrollWithEmployeeId = {
        ...payrollData,
        employeeId: employee._id
      };
      const payroll = await createPayroll(payrollWithEmployeeId, token);
      if (payroll) {
        createdPayrolls.push(payroll);
      }
    }
  }
  console.log(`✅ Created ${createdPayrolls.length} payrolls\n`);

  // Step 4: Test email functionality
  console.log('4. Testing email functionality...');
  if (createdEmployees.length > 0 && createdPayrolls.length > 0) {
    // Test invoice request email (for PJ employees)
    const pjEmployee = createdEmployees.find(emp => emp.employmentType === 'PJ');
    if (pjEmployee) {
      await sendTestEmail('invoice-request', {
        employeeId: pjEmployee._id,
        payrollId: createdPayrolls[0]._id
      }, token);
    }

    // Test payroll notification email
    await sendTestEmail('payroll-notification', {
      payrollId: createdPayrolls[0]._id
    }, token);
  }
  console.log('✅ Email tests completed\n');

  // Step 5: Test Google Drive integration
  console.log('5. Testing Google Drive integration...');
  await testGoogleDriveIntegration(token);
  console.log('✅ Google Drive tests completed\n');

  // Step 6: Display summary
  console.log('📊 Test Summary:');
  console.log(`- Employees created: ${createdEmployees.length}`);
  console.log(`- Payrolls created: ${createdPayrolls.length}`);
  console.log('- Email functionality: Tested');
  console.log('- Google Drive integration: Tested');
  
  console.log('\n🎉 Testing completed!');
  console.log('\nNext steps:');
  console.log('1. Check your email for test messages');
  console.log('2. Visit http://localhost:3001 to see the data in the UI');
  console.log('3. Configure real email settings in your .env file');
  console.log('4. Set up Google Drive credentials for spreadsheet integration');
};

// Run the tests
runTests().catch(console.error); 