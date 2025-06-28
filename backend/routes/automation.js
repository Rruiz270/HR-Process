const express = require('express');
const cron = require('cron');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const Document = require('../models/Document');
const moment = require('moment');

const router = express.Router();

// Store active cron jobs
const activeJobs = new Map();

// Automation tasks
const automationTasks = {
  // Check for expiring documents
  checkExpiringDocuments: async () => {
    try {
      console.log('Running: Check expiring documents');
      
      const thirtyDaysFromNow = moment().add(30, 'days').toDate();
      const sevenDaysFromNow = moment().add(7, 'days').toDate();
      
      const expiringDocuments = await Document.find({
        expiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() },
        status: { $ne: 'Expired' }
      }).populate('relatedEntityId', 'firstName lastName email');

      for (const document of expiringDocuments) {
        const daysUntilExpiry = moment(document.expiryDate).diff(moment(), 'days');
        
        // Send notification if expiring within 7 days
        if (daysUntilExpiry <= 7) {
          console.log(`Document ${document.name} expires in ${daysUntilExpiry} days`);
          // Here you would trigger email notification
          // await sendDocumentExpiryNotification(document);
        }
      }

      return { success: true, processed: expiringDocuments.length };
    } catch (error) {
      console.error('Check expiring documents error:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate monthly payroll
  generateMonthlyPayroll: async () => {
    try {
      console.log('Running: Generate monthly payroll');
      
      const currentMonth = moment().startOf('month');
      const activeEmployees = await Employee.find({ status: 'Active' });

      const payrolls = [];
      for (const employee of activeEmployees) {
        // Check if payroll already exists for this month
        const existingPayroll = await Payroll.findOne({
          employee: employee._id,
          payrollPeriod: {
            $gte: currentMonth.toDate(),
            $lt: moment(currentMonth).endOf('month').toDate()
          }
        });

        if (!existingPayroll) {
          // Calculate working days (assuming 22 working days per month)
          const workingDays = 22;
          
          // Calculate benefits
          const benefits = {};
          if (employee.benefits.valeTransporte.enabled) {
            benefits.valeTransporte = {
              enabled: true,
              value: employee.benefits.valeTransporte.dailyValue * workingDays
            };
          }
          if (employee.benefits.valeRefeicao.enabled) {
            benefits.valeRefeicao = {
              enabled: true,
              value: employee.benefits.valeRefeicao.dailyValue * workingDays
            };
          }
          if (employee.benefits.mobilidade.enabled) {
            benefits.mobilidade = {
              enabled: true,
              value: employee.benefits.mobilidade.monthlyValue
            };
          }

          // Calculate total
          const totalBenefits = Object.values(benefits)
            .filter(benefit => benefit.enabled)
            .reduce((sum, benefit) => sum + benefit.value, 0);

          const total = employee.baseSalary + totalBenefits;

          const payroll = new Payroll({
            employee: employee._id,
            payrollPeriod: currentMonth.toDate(),
            baseSalary: employee.baseSalary,
            workingDays: workingDays,
            benefits: benefits,
            total: total,
            status: 'Draft',
            paymentMethod: 'Bank Transfer',
            createdBy: null // System generated
          });

          payrolls.push(payroll);
        }
      }

      if (payrolls.length > 0) {
        await Payroll.insertMany(payrolls);
      }

      return { success: true, generated: payrolls.length };
    } catch (error) {
      console.error('Generate monthly payroll error:', error);
      return { success: false, error: error.message };
    }
  },

  // Request invoices for PJ employees
  requestPJInvoices: async () => {
    try {
      console.log('Running: Request PJ invoices');
      
      const currentMonth = moment().subtract(1, 'month').startOf('month');
      
      const payrolls = await Payroll.find({
        payrollPeriod: {
          $gte: currentMonth.toDate(),
          $lt: moment(currentMonth).endOf('month').toDate()
        },
        'invoiceInfo.status': { $ne: 'Requested' }
      }).populate('employee');

      const pjPayrolls = payrolls.filter(payroll => 
        payroll.employee.employmentType === 'PJ'
      );

      for (const payroll of pjPayrolls) {
        // Mark as requested (actual email sending would be done separately)
        payroll.invoiceInfo = {
          status: 'Requested',
          requestDate: new Date(),
          amount: payroll.total,
          description: `Prestação de serviços - ${moment(payroll.payrollPeriod).format('MMMM YYYY')}`
        };
        await payroll.save();
      }

      return { success: true, requested: pjPayrolls.length };
    } catch (error) {
      console.error('Request PJ invoices error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update employee status based on hire date
  updateEmployeeStatus: async () => {
    try {
      console.log('Running: Update employee status');
      
      const employees = await Employee.find({ status: 'Active' });
      let updated = 0;

      for (const employee of employees) {
        const hireDate = moment(employee.hireDate);
        const now = moment();
        const monthsWorked = now.diff(hireDate, 'months');

        // Example: Update benefits based on time worked
        let needsUpdate = false;
        
        if (monthsWorked >= 6 && !employee.benefits.healthInsurance.enabled) {
          employee.benefits.healthInsurance = {
            enabled: true,
            plan: 'Basic Health Plan'
          };
          needsUpdate = true;
        }

        if (monthsWorked >= 12 && !employee.benefits.dentalInsurance.enabled) {
          employee.benefits.dentalInsurance = {
            enabled: true,
            plan: 'Basic Dental Plan'
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          await employee.save();
          updated++;
        }
      }

      return { success: true, updated };
    } catch (error) {
      console.error('Update employee status error:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate HR reports
  generateHRReports: async () => {
    try {
      console.log('Running: Generate HR reports');
      
      const currentMonth = moment().startOf('month');
      const previousMonth = moment().subtract(1, 'month').startOf('month');

      // Employee statistics
      const employeeStats = await Employee.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
            byDepartment: { $push: '$department' }
          }
        }
      ]);

      // Payroll statistics
      const payrollStats = await Payroll.aggregate([
        {
          $match: {
            payrollPeriod: {
              $gte: previousMonth.toDate(),
              $lt: currentMonth.toDate()
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPayroll: { $sum: '$total' },
            averageSalary: { $avg: '$baseSalary' },
            totalEmployees: { $sum: 1 }
          }
        }
      ]);

      // Document statistics
      const documentStats = await Document.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            expired: { $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } },
            expiringSoon: { $sum: { $cond: [{ $and: [{ $gte: ['$expiryDate', new Date()] }, { $lte: ['$expiryDate', moment().add(30, 'days').toDate()] }] }, 1, 0] } }
          }
        }
      ]);

      const report = {
        generatedAt: new Date(),
        period: previousMonth.format('MMMM YYYY'),
        employeeStats: employeeStats[0] || {},
        payrollStats: payrollStats[0] || {},
        documentStats: documentStats[0] || {}
      };

      // Here you would save the report or send it via email
      console.log('HR Report generated:', report);

      return { success: true, report };
    } catch (error) {
      console.error('Generate HR reports error:', error);
      return { success: false, error: error.message };
    }
  }
};

// Schedule a new automation task
router.post('/schedule', auth, authorize('Admin'), [
  body('taskName').isIn(Object.keys(automationTasks)).withMessage('Valid task name is required'),
  body('cronExpression').trim().notEmpty().withMessage('Cron expression is required'),
  body('enabled').optional().isBoolean(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskName, cronExpression, enabled = true, description } = req.body;

    // Validate cron expression
    try {
      new cron.CronJob(cronExpression, () => {});
    } catch (error) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    // Create job ID
    const jobId = `${taskName}_${Date.now()}`;

    // Create cron job
    const job = new cron.CronJob(
      cronExpression,
      async () => {
        try {
          console.log(`Executing scheduled task: ${taskName}`);
          const result = await automationTasks[taskName]();
          console.log(`Task ${taskName} completed:`, result);
        } catch (error) {
          console.error(`Scheduled task ${taskName} failed:`, error);
        }
      },
      null,
      enabled
    );

    // Store job information
    const jobInfo = {
      id: jobId,
      taskName,
      cronExpression,
      enabled,
      description,
      createdAt: new Date(),
      createdBy: req.user._id,
      lastRun: null,
      nextRun: job.nextDate().toDate()
    };

    activeJobs.set(jobId, { job, info: jobInfo });

    res.json({
      message: 'Automation task scheduled successfully',
      job: jobInfo
    });
  } catch (error) {
    console.error('Schedule automation task error:', error);
    res.status(500).json({ error: 'Failed to schedule task' });
  }
});

// Get all scheduled tasks
router.get('/scheduled', auth, async (req, res) => {
  try {
    const jobs = Array.from(activeJobs.values()).map(({ info }) => info);
    res.json(jobs);
  } catch (error) {
    console.error('Get scheduled tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update scheduled task
router.put('/scheduled/:jobId', auth, authorize('Admin'), [
  body('enabled').optional().isBoolean(),
  body('cronExpression').optional().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId } = req.params;
    const { enabled, cronExpression, description } = req.body;

    const jobData = activeJobs.get(jobId);
    if (!jobData) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    const { job, info } = jobData;

    // Update job if cron expression changed
    if (cronExpression && cronExpression !== info.cronExpression) {
      try {
        new cron.CronJob(cronExpression, () => {});
      } catch (error) {
        return res.status(400).json({ error: 'Invalid cron expression' });
      }

      // Stop current job and create new one
      job.stop();
      const newJob = new cron.CronJob(
        cronExpression,
        async () => {
          try {
            console.log(`Executing scheduled task: ${info.taskName}`);
            const result = await automationTasks[info.taskName]();
            console.log(`Task ${info.taskName} completed:`, result);
          } catch (error) {
            console.error(`Scheduled task ${info.taskName} failed:`, error);
          }
        },
        null,
        enabled !== undefined ? enabled : info.enabled
      );

      activeJobs.set(jobId, { job: newJob, info: { ...info, cronExpression, nextRun: newJob.nextDate().toDate() } });
    } else if (enabled !== undefined) {
      // Just update enabled status
      if (enabled) {
        job.start();
      } else {
        job.stop();
      }
    }

    // Update job info
    const updatedInfo = {
      ...info,
      enabled: enabled !== undefined ? enabled : info.enabled,
      cronExpression: cronExpression || info.cronExpression,
      description: description || info.description,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };

    activeJobs.set(jobId, { job: activeJobs.get(jobId).job, info: updatedInfo });

    res.json({
      message: 'Scheduled task updated successfully',
      job: updatedInfo
    });
  } catch (error) {
    console.error('Update scheduled task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete scheduled task
router.delete('/scheduled/:jobId', auth, authorize('Admin'), async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobData = activeJobs.get(jobId);
    if (!jobData) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    // Stop and remove job
    jobData.job.stop();
    activeJobs.delete(jobId);

    res.json({ message: 'Scheduled task deleted successfully' });
  } catch (error) {
    console.error('Delete scheduled task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Run automation task manually
router.post('/run/:taskName', auth, authorize('Admin'), async (req, res) => {
  try {
    const { taskName } = req.params;

    if (!automationTasks[taskName]) {
      return res.status(400).json({ error: 'Invalid task name' });
    }

    console.log(`Manually running task: ${taskName}`);
    const result = await automationTasks[taskName]();

    res.json({
      message: 'Task executed successfully',
      taskName,
      result
    });
  } catch (error) {
    console.error('Run automation task error:', error);
    res.status(500).json({ error: 'Failed to run task' });
  }
});

// Get available automation tasks
router.get('/tasks', auth, async (req, res) => {
  try {
    const tasks = Object.keys(automationTasks).map(taskName => ({
      name: taskName,
      displayName: taskName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: getTaskDescription(taskName)
    }));

    res.json(tasks);
  } catch (error) {
    console.error('Get automation tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task description
function getTaskDescription(taskName) {
  const descriptions = {
    checkExpiringDocuments: 'Check for documents that are expiring soon and send notifications',
    generateMonthlyPayroll: 'Generate payroll records for all active employees for the current month',
    requestPJInvoices: 'Request invoices from PJ employees for the previous month',
    updateEmployeeStatus: 'Update employee benefits and status based on time worked',
    generateHRReports: 'Generate monthly HR reports with employee and payroll statistics'
  };
  return descriptions[taskName] || 'No description available';
}

// Get automation statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {
      totalScheduled: activeJobs.size,
      activeJobs: Array.from(activeJobs.values()).filter(({ info }) => info.enabled).length,
      availableTasks: Object.keys(automationTasks).length,
      lastRun: null
    };

    // Get last run time from any job
    for (const { info } of activeJobs.values()) {
      if (info.lastRun && (!stats.lastRun || info.lastRun > stats.lastRun)) {
        stats.lastRun = info.lastRun;
      }
    }

    res.json(stats);
  } catch (error) {
    console.error('Get automation stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize default automation tasks
const initializeDefaultTasks = () => {
  // Check expiring documents daily at 9 AM
  const checkDocumentsJob = new cron.CronJob(
    '0 9 * * *', // Daily at 9 AM
    async () => {
      try {
        console.log('Running daily document expiry check');
        await automationTasks.checkExpiringDocuments();
      } catch (error) {
        console.error('Daily document check failed:', error);
      }
    },
    null,
    true
  );

  // Generate monthly payroll on the 1st of each month at 8 AM
  const generatePayrollJob = new cron.CronJob(
    '0 8 1 * *', // 1st of each month at 8 AM
    async () => {
      try {
        console.log('Running monthly payroll generation');
        await automationTasks.generateMonthlyPayroll();
      } catch (error) {
        console.error('Monthly payroll generation failed:', error);
      }
    },
    null,
    true
  );

  // Request PJ invoices on the 5th of each month at 10 AM
  const requestInvoicesJob = new cron.CronJob(
    '0 10 5 * *', // 5th of each month at 10 AM
    async () => {
      try {
        console.log('Running PJ invoice requests');
        await automationTasks.requestPJInvoices();
      } catch (error) {
        console.error('PJ invoice requests failed:', error);
      }
    },
    null,
    true
  );

  // Generate HR reports on the last day of each month at 6 PM
  const generateReportsJob = new cron.CronJob(
    '0 18 28-31 * *', // Last day of each month at 6 PM
    async () => {
      try {
        console.log('Running HR report generation');
        await automationTasks.generateHRReports();
      } catch (error) {
        console.error('HR report generation failed:', error);
      }
    },
    null,
    true
  );

  // Store default jobs
  activeJobs.set('default_check_documents', { job: checkDocumentsJob, info: {
    id: 'default_check_documents',
    taskName: 'checkExpiringDocuments',
    cronExpression: '0 9 * * *',
    enabled: true,
    description: 'Daily document expiry check',
    createdAt: new Date(),
    createdBy: null
  }});

  activeJobs.set('default_generate_payroll', { job: generatePayrollJob, info: {
    id: 'default_generate_payroll',
    taskName: 'generateMonthlyPayroll',
    cronExpression: '0 8 1 * *',
    enabled: true,
    description: 'Monthly payroll generation',
    createdAt: new Date(),
    createdBy: null
  }});

  activeJobs.set('default_request_invoices', { job: requestInvoicesJob, info: {
    id: 'default_request_invoices',
    taskName: 'requestPJInvoices',
    cronExpression: '0 10 5 * *',
    enabled: true,
    description: 'Monthly PJ invoice requests',
    createdAt: new Date(),
    createdBy: null
  }});

  activeJobs.set('default_generate_reports', { job: generateReportsJob, info: {
    id: 'default_generate_reports',
    taskName: 'generateHRReports',
    cronExpression: '0 18 28-31 * *',
    enabled: true,
    description: 'Monthly HR report generation',
    createdAt: new Date(),
    createdBy: null
  }});

  console.log('Default automation tasks initialized');
};

// Initialize default tasks when module loads
initializeDefaultTasks();

// Demo automations array
const demoAutomations = [
  {
    id: 'auto-001',
    name: 'Send Welcome Email',
    description: 'Automatically send a welcome email to new employees.',
    status: 'active',
    lastRun: new Date(Date.now() - 86400000),
    schedule: '0 9 * * *',
    type: 'email',
  },
  {
    id: 'auto-002',
    name: 'Sync Payroll Data',
    description: 'Sync payroll data with Google Sheets every Friday.',
    status: 'paused',
    lastRun: new Date(Date.now() - 604800000),
    schedule: '0 18 * * 5',
    type: 'sheets',
  },
  {
    id: 'auto-003',
    name: 'Document Expiry Reminder',
    description: 'Remind employees about expiring documents.',
    status: 'active',
    lastRun: new Date(Date.now() - 172800000),
    schedule: '0 10 * * 1',
    type: 'reminder',
  },
];

// GET /api/automation - List all automations
router.get('/', (req, res) => {
  res.json(demoAutomations);
});

module.exports = router; 