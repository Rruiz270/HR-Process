const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const moment = require('moment');

const router = express.Router();

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  invoiceRequest: {
    subject: 'Solicitação de Nota Fiscal - {employeeName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Solicitação de Nota Fiscal</h2>
        <p>Olá <strong>{employeeName}</strong>,</p>
        <p>Solicitamos a emissão da nota fiscal referente ao período de trabalho:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Período:</strong> {period}</p>
          <p><strong>Valor:</strong> R$ {amount}</p>
          <p><strong>Descrição:</strong> {description}</p>
        </div>
        <p>Por favor, envie a nota fiscal para: <strong>{companyEmail}</strong></p>
        <p>Agradecemos sua atenção.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Esta é uma mensagem automática do sistema de RH.
        </p>
      </div>
    `
  },
  payrollNotification: {
    subject: 'Folha de Pagamento - {period}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Folha de Pagamento</h2>
        <p>Olá <strong>{employeeName}</strong>,</p>
        <p>Sua folha de pagamento para o período <strong>{period}</strong> foi processada.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Salário Base:</strong> R$ {baseSalary}</p>
          <p><strong>Total de Benefícios:</strong> R$ {totalBenefits}</p>
          <p><strong>Total de Descontos:</strong> R$ {totalDeductions}</p>
          <p><strong>Valor Total:</strong> R$ {totalAmount}</p>
        </div>
        <p>O pagamento será realizado conforme o método: <strong>{paymentMethod}</strong></p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Esta é uma mensagem automática do sistema de RH.
        </p>
      </div>
    `
  },
  documentExpiry: {
    subject: 'Documento Expirando - {documentName}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b6b;">Documento Expirando</h2>
        <p>Olá <strong>{employeeName}</strong>,</p>
        <p>O documento <strong>{documentName}</strong> irá expirar em <strong>{daysUntilExpiry}</strong> dias.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Documento:</strong> {documentName}</p>
          <p><strong>Data de Expiração:</strong> {expiryDate}</p>
          <p><strong>Tipo:</strong> {documentType}</p>
        </div>
        <p>Por favor, atualize este documento o quanto antes para evitar interrupções.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Esta é uma mensagem automática do sistema de RH.
        </p>
      </div>
    `
  },
  benefitRequest: {
    subject: 'Solicitação de Benefício - {benefitType}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Solicitação de Benefício</h2>
        <p>Olá <strong>{employeeName}</strong>,</p>
        <p>Sua solicitação de benefício foi processada:</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p><strong>Tipo de Benefício:</strong> {benefitType}</p>
          <p><strong>Valor:</strong> R$ {benefitValue}</p>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Data de Processamento:</strong> {processingDate}</p>
        </div>
        <p>Em caso de dúvidas, entre em contato com o RH.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Esta é uma mensagem automática do sistema de RH.
        </p>
      </div>
    `
  }
};

// Send invoice request email
router.post('/invoice-request', auth, authorize('Admin', 'HR'), [
  body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
  body('payrollId').isMongoId().withMessage('Valid payroll ID is required'),
  body('customMessage').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, payrollId, customMessage } = req.body;

    // Get employee and payroll data
    const employee = await Employee.findById(employeeId);
    const payroll = await Payroll.findById(payrollId).populate('employee');

    if (!employee || !payroll) {
      return res.status(404).json({ error: 'Employee or payroll not found' });
    }

    if (employee.employmentType !== 'PJ') {
      return res.status(400).json({ error: 'Invoice can only be requested for PJ employees' });
    }

    // Prepare email data
    const emailData = {
      employeeName: employee.firstName + ' ' + employee.lastName,
      period: moment(payroll.payrollPeriod).format('MMMM YYYY'),
      amount: payroll.total.toFixed(2),
      description: `Prestação de serviços - ${moment(payroll.payrollPeriod).format('MMMM YYYY')}`,
      companyEmail: process.env.COMPANY_EMAIL || 'rh@empresa.com'
    };

    // Get template and replace placeholders
    const template = emailTemplates.invoiceRequest;
    let subject = template.subject.replace('{employeeName}', emailData.employeeName);
    let html = template.html
      .replace(/{employeeName}/g, emailData.employeeName)
      .replace(/{period}/g, emailData.period)
      .replace(/{amount}/g, emailData.amount)
      .replace(/{description}/g, emailData.description)
      .replace(/{companyEmail}/g, emailData.companyEmail);

    // Add custom message if provided
    if (customMessage) {
      html = html.replace(
        '<p>Agradecemos sua atenção.</p>',
        `<p>${customMessage}</p><p>Agradecemos sua atenção.</p>`
      );
    }

    // Send email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employee.email,
      cc: employee.personalEmail,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    // Update payroll with invoice request
    payroll.invoiceInfo = {
      ...payroll.invoiceInfo,
      emailSent: true,
      emailSentDate: new Date(),
      emailSentBy: req.user._id
    };
    await payroll.save();

    res.json({
      message: 'Invoice request email sent successfully',
      messageId: result.messageId,
      to: employee.email
    });
  } catch (error) {
    console.error('Send invoice request email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send payroll notification email
router.post('/payroll-notification', auth, authorize('Admin', 'HR'), [
  body('payrollId').isMongoId().withMessage('Valid payroll ID is required'),
  body('includeDetails').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payrollId, includeDetails = false } = req.body;

    const payroll = await Payroll.findById(payrollId).populate('employee');
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    const employee = payroll.employee;

    // Prepare email data
    const emailData = {
      employeeName: employee.firstName + ' ' + employee.lastName,
      period: moment(payroll.payrollPeriod).format('MMMM YYYY'),
      baseSalary: payroll.baseSalary.toFixed(2),
      totalBenefits: Object.values(payroll.benefits)
        .filter(benefit => benefit.enabled)
        .reduce((sum, benefit) => sum + benefit.value, 0).toFixed(2),
      totalDeductions: (payroll.deductions || [])
        .reduce((sum, deduction) => sum + deduction.amount, 0).toFixed(2),
      totalAmount: payroll.total.toFixed(2),
      paymentMethod: payroll.paymentMethod
    };

    // Get template and replace placeholders
    const template = emailTemplates.payrollNotification;
    let subject = template.subject.replace('{period}', emailData.period);
    let html = template.html
      .replace(/{employeeName}/g, emailData.employeeName)
      .replace(/{period}/g, emailData.period)
      .replace(/{baseSalary}/g, emailData.baseSalary)
      .replace(/{totalBenefits}/g, emailData.totalBenefits)
      .replace(/{totalDeductions}/g, emailData.totalDeductions)
      .replace(/{totalAmount}/g, emailData.totalAmount)
      .replace(/{paymentMethod}/g, emailData.paymentMethod);

    // Send email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employee.email,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    // Update payroll with notification sent
    payroll.notifications = payroll.notifications || [];
    payroll.notifications.push({
      type: 'Email',
      sentDate: new Date(),
      sentBy: req.user._id,
      recipient: employee.email
    });
    await payroll.save();

    res.json({
      message: 'Payroll notification email sent successfully',
      messageId: result.messageId,
      to: employee.email
    });
  } catch (error) {
    console.error('Send payroll notification error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send document expiry notification
router.post('/document-expiry', auth, authorize('Admin', 'HR'), [
  body('documentId').isMongoId().withMessage('Valid document ID is required'),
  body('employeeId').isMongoId().withMessage('Valid employee ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, employeeId } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // This would typically come from the Document model
    // For now, we'll use placeholder data
    const documentData = {
      name: 'Documento de Identidade',
      type: 'ID',
      expiryDate: moment().add(30, 'days').format('DD/MM/YYYY'),
      daysUntilExpiry: 30
    };

    // Prepare email data
    const emailData = {
      employeeName: employee.firstName + ' ' + employee.lastName,
      documentName: documentData.name,
      documentType: documentData.type,
      expiryDate: documentData.expiryDate,
      daysUntilExpiry: documentData.daysUntilExpiry
    };

    // Get template and replace placeholders
    const template = emailTemplates.documentExpiry;
    let subject = template.subject.replace('{documentName}', emailData.documentName);
    let html = template.html
      .replace(/{employeeName}/g, emailData.employeeName)
      .replace(/{documentName}/g, emailData.documentName)
      .replace(/{documentType}/g, emailData.documentType)
      .replace(/{expiryDate}/g, emailData.expiryDate)
      .replace(/{daysUntilExpiry}/g, emailData.daysUntilExpiry);

    // Send email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employee.email,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      message: 'Document expiry notification sent successfully',
      messageId: result.messageId,
      to: employee.email
    });
  } catch (error) {
    console.error('Send document expiry notification error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send benefit request notification
router.post('/benefit-request', auth, authorize('Admin', 'HR'), [
  body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
  body('benefitType').notEmpty().withMessage('Benefit type is required'),
  body('benefitValue').isNumeric().withMessage('Valid benefit value is required'),
  body('status').isIn(['Approved', 'Pending', 'Rejected']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, benefitType, benefitValue, status } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Prepare email data
    const emailData = {
      employeeName: employee.firstName + ' ' + employee.lastName,
      benefitType: benefitType,
      benefitValue: parseFloat(benefitValue).toFixed(2),
      status: status,
      processingDate: moment().format('DD/MM/YYYY')
    };

    // Get template and replace placeholders
    const template = emailTemplates.benefitRequest;
    let subject = template.subject.replace('{benefitType}', emailData.benefitType);
    let html = template.html
      .replace(/{employeeName}/g, emailData.employeeName)
      .replace(/{benefitType}/g, emailData.benefitType)
      .replace(/{benefitValue}/g, emailData.benefitValue)
      .replace(/{status}/g, emailData.status)
      .replace(/{processingDate}/g, emailData.processingDate);

    // Send email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employee.email,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      message: 'Benefit request notification sent successfully',
      messageId: result.messageId,
      to: employee.email
    });
  } catch (error) {
    console.error('Send benefit request notification error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send custom email
router.post('/custom', auth, authorize('Admin', 'HR'), [
  body('to').isEmail().withMessage('Valid recipient email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('cc').optional().isArray(),
  body('bcc').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, message, cc, bcc } = req.body;

    // Convert message to HTML if it's plain text
    const htmlMessage = message.replace(/\n/g, '<br>');

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${htmlMessage}
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Esta é uma mensagem do sistema de RH.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      message: 'Custom email sent successfully',
      messageId: result.messageId,
      to: to
    });
  } catch (error) {
    console.error('Send custom email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get email templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = Object.keys(emailTemplates).map(key => ({
      id: key,
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      subject: emailTemplates[key].subject,
      description: `Template for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} emails`
    }));

    res.json(templates);
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test email configuration
router.post('/test', auth, authorize('Admin'), async (req, res) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: req.user.email,
      subject: 'Test Email - HR System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from the HR system.</p>
          <p>If you received this email, the email configuration is working correctly.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      message: 'Test email sent successfully',
      messageId: result.messageId,
      to: req.user.email
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router; 