const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  configure(config) {
    try {
      this.transporter = nodemailer.createTransporter({
        host: config.smtpHost || process.env.SMTP_HOST,
        port: config.smtpPort || process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.smtpUser || process.env.SMTP_USER,
          pass: config.smtpPass || process.env.SMTP_PASS,
        },
      });
      
      this.companyEmail = config.companyEmail || process.env.COMPANY_EMAIL;
      this.companyName = config.companyName || process.env.COMPANY_NAME || 'HR System';
      this.isConfigured = true;
      
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }

  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }
    
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      throw new Error(`Email connection test failed: ${error.message}`);
    }
  }

  async sendEmail(options) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"${this.companyName}" <${this.companyEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments || []
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 