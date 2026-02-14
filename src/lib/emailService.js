/**
 * Enhanced Email Service using Nodemailer
 * Handles all email notifications for the JECRC UNIVERSITY NO DUES System
 * 
 * Features:
 * - SMTP connection pooling
 * - Inline retry with exponential backoff (no cron dependency)
 * - Graceful failure handling
 * - Notification settings management
 * - Certificate generation and tracking
 * - Email logging and statistics
 * 
 * OPTIMIZED: Reduced from 15 emails per student to just 3:
 * 1. One combined email to ALL departments (not individual)
 * 2. One email to student on rejection
 * 3. One email to student when fully approved
 * 
 * SERVER-SIDE ONLY: This service can only be used on the server
 */

// Prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('Email service can only be used on the server side');
}

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Lazy Supabase client for email logging
let supabase = null;

function getSupabase() {
  if (!supabase) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Return safe mock if env vars missing (e.g. during build)
      return { from: () => ({ insert: () => ({ error: null }), select: () => ({ data: [], error: null }) }) };
    }
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return supabase;
}

// Email types for tracking
export const EMAIL_TYPES = {
  DEPARTMENT_NOTIFICATION: 'department_notification',
  CERTIFICATE_GENERATED: 'certificate_generated',
  CERTIFICATE_SENT: 'certificate_sent',
  STATUS_UPDATE: 'status_update',
  REAPPLICATION_SUBMITTED: 'reapplication_submitted',
  SUPPORT_TICKET_CREATED: 'support_ticket_created',
  SUPPORT_TICKET_RESOLVED: 'support_ticket_resolved',
  REMINDER_PENDING: 'reminder_pending',
  REMINDER_REAPPLY: 'reminder_reapply'
};

// Email configuration optimized for Render deployment
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true, // Use connection pooling
  maxConnections: 2, // Reduced for Render stability
  maxMessages: 20, // Reduced batch size for Render
  connectionTimeout: 30000, // 30 seconds for Render network
  greetingTimeout: 30000,
  socketTimeout: 30000,
  // Render-specific optimizations
  disableFileAccess: true,
  disableUrlAccess: true,
  // Additional Render network optimizations
  requireTLS: true, // Force TLS for better security and compatibility
  ignoreTLS: false,
  // Connection retry settings
  retryCount: 3,
  retryDelay: 2000
};

const FROM_EMAIL = process.env.SMTP_FROM || 'JECRC UNIVERSITY NO DUES <noreply@jecrcuniversity.edu.in>';

// Transporter with lazy initialization and health tracking
let transporter = null;
let transporterCreatedAt = 0;
const TRANSPORTER_MAX_AGE = 10 * 60 * 1000; // Recreate transporter every 10 minutes

/**
 * Get or create SMTP transporter with connection health management
 */
async function getTransporter() {
  const now = Date.now();

  // Recreate transporter if too old or doesn't exist
  if (!transporter || (now - transporterCreatedAt > TRANSPORTER_MAX_AGE)) {
    if (transporter) {
      try {
        transporter.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    transporter = nodemailer.createTransport(SMTP_CONFIG);
    transporterCreatedAt = now;

    // Verify connection (async, but we don't wait)
    transporter.verify()
      .then(() => console.log('✅ SMTP connection verified'))
      .catch(err => console.warn('⚠️ SMTP verification failed:', err.message));
  }

  return transporter;
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send email with inline retry logic
 * Attempts up to 3 times with exponential backoff: 1s, 2s, 4s
 */
async function sendWithRetry(mailOptions, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transport = await getTransporter();
      const info = await transport.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Email attempt ${attempt}/${maxRetries} failed:`, error.message);

      // If transporter error, recreate it
      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        transporter = null;
      }

      // Don't retry on final attempt
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: lastError?.message || 'Max retries exceeded' };
}

/**
 * Send email directly using Nodemailer with retry logic
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string|string[]} params.cc - CC recipient email(s) (optional)
 * @param {string|string[]} params.bcc - BCC recipient email(s) (optional)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
 */
export async function sendEmail({ to, cc, bcc, subject, html, text, metadata = {} }) {
  // Validate inputs
  if (!to || !subject || !html) {
    console.error('❌ Missing required email parameters');
    return { success: false, error: 'Missing required email parameters' };
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP not configured. SMTP_USER and SMTP_PASS are required.');
    return { success: false, error: 'SMTP not configured' };
  }

  // Prepare email options
  const mailOptions = {
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || stripHtml(html)
  };

  // Add CC if provided
  if (cc) {
    mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
  }

  // Add BCC if provided
  if (bcc) {
    mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
  }

  // Send with inline retry logic
  const result = await sendWithRetry(mailOptions, 3);

  if (result.success) {
    console.log(`✅ Email sent successfully - ID: ${result.messageId}`);
    console.log(`   TO: ${mailOptions.to}`);
    if (cc) console.log(`   CC: ${mailOptions.cc}`);
    if (bcc) console.log(`   BCC: ${mailOptions.bcc}`);
  } else {
    console.error(`❌ Email failed after retries: ${result.error}`);
    console.error('   SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.error('   SMTP User:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
  }

  return result;
}

/**
 * Generate HTML email template
 * @param {Object} params - Template parameters
 * @returns {string} - HTML content
 */
function generateEmailTemplate({ title, content, actionUrl, actionText, footerText }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                JECRC UNIVERSITY
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                NO DUES Clearance System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                ${title}
              </h2>
              ${content}
              
              ${actionUrl && actionText ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                  <tr>
                    <td align="center">
                      <a href="${actionUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        ${actionText}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                ${footerText || 'This is an automated email from JECRC UNIVERSITY NO DUES System.'}
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} JECRC University. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 🚫 DISABLED: No longer sending individual department notifications
 * Only daily summaries and admin-triggered notifications are sent
 * 
 * @deprecated - Use sendDailyDepartmentDigest or admin-triggered notifications instead
 */
export async function sendCombinedDepartmentNotification({
  allStaffEmails,
  studentName,
  registrationNo,
  school,
  course,
  branch,
  formId,
  dashboardUrl
}) {
  console.log('🚫 Individual department notifications disabled - only daily summaries sent');
  return { success: true, skipped: true, reason: 'Individual notifications disabled' };
}

/**
 * Send reminder email to department staff
 * @param {Object} params - Reminder parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendDepartmentReminder({
  staffEmails,
  departmentName,
  pendingCount,
  customMessage,
  dashboardUrl,
  isAdminTriggered = false
}) {
  // Use centralized URL helper
  const { APP_URLS, getFullUrl } = require('./urlHelper');
  const actionUrl = dashboardUrl || getFullUrl(APP_URLS.STAFF_LOGIN); // Always use login for staff

  const priority = isAdminTriggered ? '🔴 ADMIN ALERT' : '⏰ REMINDER';
  const priorityColor = isAdminTriggered ? '#dc2626' : '#f59e0b';

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Hello <strong>${departmentName}</strong> Team,
    </p>
    
    ${isAdminTriggered ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
        🚨 ADMIN TRIGGERED NOTIFICATION
      </p>
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
        This notification was sent directly by the administration. Please prioritize your review of pending applications.
      </p>
    </div>
    ` : ''}
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      ${customMessage || `You have <strong style="color: ${priorityColor};">${pendingCount}</strong> pending No Dues application${pendingCount > 1 ? 's' : ''} awaiting your review.`}
    </p>
    
    ${pendingCount > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
            ${priority}: ${pendingCount} Application${pendingCount > 1 ? 's' : ''} Pending
          </p>
          <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 13px; line-height: 1.6;">
            Prompt action helps students receive their certificates on time. Please log in to your dashboard to review and process these applications.
          </p>
        </td>
      </tr>
    </table>
    ` : `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">
        ✅ All Applications Processed
      </p>
      <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 13px; line-height: 1.6;">
        Great job! You have no pending applications at this time.
      </p>
    </div>
    `}
    
    ${isAdminTriggered ? `
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 12px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        This is an administrative notification. For questions, please contact the system administrator.
      </p>
    </div>
    ` : ''}
  `;

  const html = generateEmailTemplate({
    title: `${priority}: ${departmentName} Department`,
    content,
    actionUrl: dashboardUrl,
    actionText: pendingCount > 0 ? 'Review Applications' : 'View Dashboard',
    footerText: isAdminTriggered
      ? 'Admin-triggered notification. Priority response requested.'
      : `Automated reminder sent to ${departmentName} department.`
  });

  const subject = isAdminTriggered
    ? `🚨 Admin Alert: ${departmentName} - ${pendingCount} Pending`
    : `⏰ Reminder: ${departmentName} - ${pendingCount} Pending`;

  return sendEmail({
    to: staffEmails[0],
    cc: staffEmails.slice(1),
    subject,
    html,
    metadata: {
      type: isAdminTriggered ? 'admin_triggered_notification' : 'department_reminder',
      departmentName,
      pendingCount,
      isAdminTriggered
    }
  });
}

/**
 * Send rejection notification to student
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendRejectionNotification({
  studentEmail,
  studentName,
  registrationNo,
  departmentName,
  rejectionReason,
  dashboardUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Dear <strong>${studentName}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      We regret to inform you that your No Dues application has been <strong style="color: #dc2626;">rejected</strong> by the <strong>${departmentName}</strong> department.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #dc2626; font-size: 18px; font-weight: 600;">
            ❌ Application Rejected
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Department:</strong> ${departmentName}
          </p>
          ${rejectionReason ? `
          <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 14px;">
            <strong>Reason:</strong> ${rejectionReason}
          </p>
          ` : ''}
        </td>
      </tr>
    </table>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>📝 What's Next?</strong><br/>
        You can reapply for No Dues clearance after addressing the concerns mentioned above. Please review the feedback and submit a new application when ready.
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      If you believe this rejection was made in error, please contact the support team or visit your dashboard for more information.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'No Dues Application Rejected',
    content,
    actionUrl: dashboardUrl,
    actionText: 'View Application Details',
    footerText: 'This is an automated notification from JECRC UNIVERSITY NO DUES System.'
  });

  return sendEmail({
    to: studentEmail,
    subject: `❌ Application Rejected: ${departmentName} - ${registrationNo}`,
    html,
    metadata: {
      type: 'rejection',
      departmentName,
      registrationNo,
      rejectionReason
    }
  });
}

/**
 * Send status update notification to student
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendStudentStatusUpdate({
  studentEmail,
  studentName,
  registrationNo,
  departmentName,
  status,
  dashboardUrl
}) {
  const statusConfig = {
    approved: {
      color: '#16a34a',
      icon: '✅',
      title: 'Application Approved',
      message: 'Great news! Your application has been approved.'
    },
    rejected: {
      color: '#dc2626',
      icon: '❌',
      title: 'Application Rejected',
      message: 'Your application has been rejected.'
    },
    in_progress: {
      color: '#f59e0b',
      icon: '⏳',
      title: 'Application In Progress',
      message: 'Your application is being reviewed.'
    }
  };

  const config = statusConfig[status] || statusConfig.in_progress;

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Dear <strong>${studentName}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      ${config.message}
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #16a34a; font-size: 18px; font-weight: 600;">
            ${config.icon} ${config.title}
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Department:</strong> ${departmentName}
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;">
            <strong>Status:</strong> <span style="color: ${config.color}; font-weight: 600;">${status.toUpperCase()}</span>
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      You can check your application status anytime by logging into your dashboard.
    </p>
  `;

  const html = generateEmailTemplate({
    title: config.title,
    content,
    actionUrl: dashboardUrl,
    actionText: 'View Application Status',
    footerText: 'This is an automated notification from JECRC UNIVERSITY NO DUES System.'
  });

  return sendEmail({
    to: studentEmail,
    subject: `${config.icon} ${config.title}: ${departmentName} - ${registrationNo}`,
    html,
    metadata: {
      type: 'status_update',
      departmentName,
      registrationNo,
      status
    }
  });
}

/**
 * Send reapplication confirmation to student
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendReapplicationConfirmation({
  studentEmail,
  studentName,
  registrationNo,
  reapplicationNumber,
  dashboardUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Dear <strong>${studentName}</strong>,
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      We have received your reapplication for No Dues clearance. This is your <strong style="color: #f59e0b;">reapplication #${reapplicationNumber}</strong>.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">
            🔄 Reapplication Received
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
          <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            <strong>Reapplication Number:</strong> ${reapplicationNumber}
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;">
            <strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">Under Review</span>
          </p>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>📋 Next Steps:</strong><br/>
        The relevant departments will review your reapplication. You will be notified of any status changes via email.
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      You can track your application status in real-time by logging into your dashboard.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Reapplication Received',
    content,
    actionUrl: dashboardUrl,
    actionText: 'Track Application Status',
    footerText: 'This is an automated notification from JECRC UNIVERSITY NO DUES System.'
  });

  return sendEmail({
    to: studentEmail,
    subject: `🔄 Reapplication #${reapplicationNumber} Received - ${registrationNo}`,
    html,
    metadata: {
      type: 'reapplication_confirmation',
      registrationNo,
      reapplicationNumber
    }
  });
}
export async function sendCertificateReadyNotification({
  studentEmail,
  studentName,
  registrationNo,
  certificateUrl
}) {
  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      Congratulations <strong>${studentName}</strong>! 🎉
    </p>
    
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      All departments have approved your No Dues application. Your certificate is now ready for download.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; color: #16a34a; font-size: 18px; font-weight: 600;">
            ✅ All Departments Approved
          </p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;">
            <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
          </p>
        </td>
      </tr>
    </table>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>📥 Download Your Certificate:</strong><br/>
        Click the button below to access your No Dues Certificate. You can download and print it for official use.
      </p>
    </div>
  `;

  const html = generateEmailTemplate({
    title: '🎓 No Dues Certificate Ready',
    content,
    actionUrl: certificateUrl,
    actionText: '📥 Download Certificate'
  });

  return sendEmail({
    to: studentEmail,
    subject: `🎓 Certificate Ready: ${registrationNo}`,
    html,
    metadata: { type: 'certificate_ready' }
  });
}

/**
 * 🆕 OPTIMIZED: Send ONE email for reapplication (combined to all departments)
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendReapplicationNotification({
  allStaffEmails,
  studentName,
  registrationNo,
  studentMessage,
  reapplicationNumber,
  school,
  course,
  branch,
  dashboardUrl
}) {
  // Use centralized URL helper
  const { APP_URLS, getFullUrl } = require('./urlHelper');
  const actionUrl = dashboardUrl || getFullUrl(APP_URLS.STAFF_LOGIN); // Always use login for staff

  if (!allStaffEmails || allStaffEmails.length === 0) {
    console.warn('⚠️ No staff emails for reapplication notification');
    return { success: false, error: 'No recipients' };
  }

  console.log(`📧 Sending COMBINED reapplication notification to ${allStaffEmails.length} staff members...`);

  const content = `
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      A student has <strong>reapplied</strong> to their No Dues application after addressing previous concerns.
    </p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
      <tr><td>
        <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 16px; font-weight: 600;">
          🔄 Reapplication #${reapplicationNumber}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Student:</strong> ${studentName}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Registration No:</strong> <span style="font-family: monospace;">${registrationNo}</span>
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>School:</strong> ${school}
        </p>
        <p style="margin: 0 0 6px 0; color: #1f2937; font-size: 15px;">
          <strong>Course:</strong> ${course}
        </p>
        <p style="margin: 0; color: #1f2937; font-size: 15px;">
          <strong>Branch:</strong> ${branch}
        </p>
      </td></tr>
    </table>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #3b82f6; font-size: 13px; font-weight: 600;">
        STUDENT'S RESPONSE
      </p>
      <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-style: italic;">
        "${studentMessage}"
      </p>
    </div>
    
    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please log in to review the updated application and take appropriate action.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Student Reapplication - Review Required',
    content,
    actionUrl: dashboardUrl,
    actionText: 'Review Reapplication'
  });

  return sendEmail({
    to: allStaffEmails[0],
    cc: allStaffEmails.slice(1), // CC all others (visible to everyone)
    subject: `🔄 Reapplication #${reapplicationNumber}: ${studentName} (${registrationNo})`,
    html,
    metadata: { type: 'reapplication', reapplicationNumber, recipientCount: allStaffEmails.length }
  });
}

/**
 * Send support ticket response to user
 * @param {Object} params - Response parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendSupportTicketResponse({
  userEmail,
  ticketNumber,
  subject,
  adminResponse,
  status,
  resolvedBy
}) {
  // Use centralized URL helper
  const { APP_URLS, getFullUrl } = require('./urlHelper');

  const statusMessages = {
    'resolved': 'Your ticket has been resolved.',
    'closed': 'Your ticket has been closed.',
    'in_progress': 'Your ticket is being worked on.'
  };

  const content = `
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">💬</div>
      <h2 style="color: white; margin: 0; font-size: 22px;">Support Update</h2>
    </div>
    
    <p style="color: #374151; line-height: 1.8; font-size: 15px;">
      Hello,<br><br>
      ${statusMessages[status] || 'There is an update on your support ticket.'}
    </p>
    
    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #C41E3A;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Ticket #${ticketNumber}</p>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Subject: ${subject}</p>
    </div>
    
    ${adminResponse ? `
    <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <p style="font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">📝 Response from Support Team:</p>
      <p style="color: #374151; line-height: 1.8; margin: 0; white-space: pre-wrap;">${adminResponse}</p>
    </div>
    ` : ''}
    
    <p style="color: #6b7280; font-size: 13px; margin-top: 25px;">
      If you have further questions, please submit a new support request.
    </p>
  `;

  const html = generateEmailTemplate({
    title: `Ticket Update: ${ticketNumber}`,
    content,
    actionUrl: getFullUrl(APP_URLS.STUDENT_CHECK_STATUS), // Direct to check status with param handled client-side
    actionText: 'Check Your Status',
    footerText: `Resolved by: ${resolvedBy || 'Support Team'}`
  });

  return sendEmail({
    to: userEmail,
    subject: `[Ticket ${ticketNumber}] ${statusMessages[status] || 'Update'} - ${subject}`,
    html,
    metadata: { type: 'support_response', ticketNumber, status }
  });
}

/**
 * Send gentle reminder to department staff about pending applications
 * @param {Object} params - Reminder parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendStudentReminder({
  staffEmails,
  studentName,
  registrationNo,
  departmentName,
  daysPending,
  customMessage,
  dashboardUrl
}) {
  // Use centralized URL helper
  const { APP_URLS, getFullUrl } = require('./urlHelper');
  const actionUrl = dashboardUrl || getFullUrl(APP_URLS.STAFF_LOGIN); // Always use login for staff

  const urgencyLevel = daysPending >= 7 ? 'high' : daysPending >= 3 ? 'medium' : 'low';
  const urgencyColors = {
    high: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
    medium: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' },
    low: { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' }
  };
  const colors = urgencyColors[urgencyLevel];

  const content = `
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
      <h2 style="color: white; margin: 0; font-size: 22px;">Gentle Reminder</h2>
    </div>
    
    <p style="color: #374151; line-height: 1.8; font-size: 15px;">
      Hello ${departmentName} Team,<br><br>
      This is a friendly reminder about a pending no-dues application that requires your attention.
    </p>
    
    <div style="background: ${colors.bg}; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${colors.border};">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">📋 Student: ${studentName}</p>
      <p style="margin: 0 0 8px 0; color: #6b7280;">Registration No: ${registrationNo}</p>
      <p style="margin: 0; color: ${colors.text}; font-weight: 600;">
        ⏱️ Pending for: ${daysPending} day${daysPending !== 1 ? 's' : ''}
      </p>
    </div>
    
    ${customMessage ? `
    <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #374151; font-style: italic;">"${customMessage}"</p>
      <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">— Registration Office</p>
    </div>
    ` : ''}
    
    <p style="color: #374151; line-height: 1.8; margin: 20px 0;">
      Please review this application at your earliest convenience. Timely processing helps students complete their clearance smoothly.
    </p>
  `;

  const html = generateEmailTemplate({
    title: 'Pending Application Reminder',
    content,
    actionUrl: dashboardUrl || 'https://newnodues.vercel.app/staff/dashboard',
    actionText: 'Review Application',
    footerText: 'This is an automated reminder from the Registration Office.'
  });

  return sendEmail({
    to: staffEmails[0],
    cc: staffEmails.slice(1),
    subject: `⏰ Reminder: ${studentName} (${registrationNo}) - Pending ${daysPending} days`,
    html,
    metadata: { type: 'department_reminder', departmentName, daysPending, registrationNo }
  });
}

/**
 * 🆕 OPTIMIZED: Send a DAILY SUMMARY of all pending applications to each department
 * This replaces high-frequency immediate emails. Triggered lazily @ 3:00 PM.
 * @param {Object} params - Digest parameters
 * @returns {Promise<Object>} - Digest result
 */
export async function sendDailyDepartmentDigest({
  pendingApplications, // Array of applications grouped by department
  allStaff,            // Array of staff profiles
  dashboardUrl
}) {
  // Use centralized URL helper
  const { APP_URLS, getFullUrl } = require('./urlHelper');
  const actionUrl = dashboardUrl || getFullUrl(APP_URLS.STAFF_LOGIN); // Always use login for staff

  if (!pendingApplications || pendingApplications.length === 0) {
    console.log('📝 No pending applications for today\'s digest.');
    return { success: true, skipped: true };
  }

  console.log(`📧 Preparing Daily Digest for ${pendingApplications.length} pending items...`);

  // Group staff by department for CCing correctly
  const staffByDept = allStaff.reduce((acc, staff) => {
    const dept = staff.department_name;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(staff.email);
    return acc;
  }, {});

  // Group applications by department
  const appsByDept = pendingApplications.reduce((acc, app) => {
    const dept = app.department_name;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(app);
    return acc;
  }, {});

  const results = [];

  for (const deptName of Object.keys(appsByDept)) {
    const deptApps = appsByDept[deptName];
    const deptEmails = staffByDept[deptName] || [];

    if (deptEmails.length === 0) continue;

    const deptDisplayName = (deptName === 'school_hod' ? 'Academic (HOD)' : deptName).replace(/_/g, ' ').toUpperCase();

    // Create HTML Table for applications
    const tableRows = deptApps.map(app => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 14px; color: #1f2937;">${app.no_dues_forms.student_name}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #1f2937; font-family: monospace;">${app.no_dues_forms.registration_no}</td>
        <td style="padding: 12px 8px; font-size: 14px; color: #6b7280;">${app.no_dues_forms.course}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #6b7280;">${new Date(app.no_dues_forms.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const content = `
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello <strong>${deptDisplayName}</strong> Team,
      </p>
      
      <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        This is your daily summary of <strong>pending No Dues applications</strong> requiring your department's review as of 3:00 PM today.
      </p>
      
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead style="background-color: #f9fafb;">
            <tr>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Student Name</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Reg No</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Course</th>
              <th align="left" style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>⚡ Action Required:</strong> Please log in to your dashboard to process these applications. 
          Prompt approval helps ensure students receive their certificates on time.
        </p>
      </div>
    `;

    const html = generateEmailTemplate({
      title: 'Daily Department Digest',
      content,
      actionUrl: dashboardUrl,
      actionText: 'Go to Dashboard',
      footerText: `This is a daily summary sent to the ${deptDisplayName} department. Total pending: ${deptApps.length}`
    });

    const result = await sendEmail({
      to: deptEmails[0],
      cc: deptEmails.slice(1),
      subject: `📋 Daily Digest: ${deptApps.length} Pending Applications - ${deptDisplayName}`,
      html
    });

    results.push({ dept: deptName, success: result.success });
  }

  return {
    success: results.every(r => r.success),
    summary: results,
    totalSent: results.filter(r => r.success).length
  };
}

/**
 * Log email to database for tracking and analytics
 */
async function logEmail(emailData) {
  try {
    const { data, error } = await getSupabase()
      .from('email_logs')
      .insert({
        email_type: emailData.emailType,
        recipient_email: emailData.recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        status: emailData.status || 'pending',
        error_message: emailData.errorMessage,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to log email:', error);
    return null;
  }
}

/**
 * Update email log with status
 */
async function updateEmailLog(logId, updates) {
  try {
    const { error } = await getSupabase()
      .from('email_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update email log:', error);
  }
}

/**
 * Get user notification settings
 */
async function getUserNotificationSettings(userId) {
  try {
    const { data, error } = await getSupabase()
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    // Return default settings if none found
    return data || {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      departmentEmails: true,
      certificateEmail: true,
      statusEmails: true,
      reminderEmails: true,
      supportEmails: true
    };
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      departmentEmails: true,
      certificateEmail: true,
      statusEmails: true,
      reminderEmails: true,
      supportEmails: true
    };
  }
}

/**
 * Update user notification settings
 */
async function updateUserNotificationSettings(userId, settings) {
  try {
    const { data, error } = await getSupabase()
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    throw error;
  }
}

/**
 * Send certificate email with tracking
 */
async function sendCertificateEmail(studentEmail, certificateData) {
  const subject = `🎓 No Dues Certificate Generated - ${certificateData.registrationNo}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>No Dues Certificate</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .certificate { background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 JECRC No Dues Certificate</h1>
        <p>Certificate Generated Successfully</p>
      </div>
      
      <div class="content">
        <h2>Congratulations!</h2>
        <p>Your no-dues certificate has been generated successfully.</p>
        
        <div class="certificate">
          <h3>📜 Certificate of Clearance</h3>
          <p><strong>${certificateData.student_name}</strong></p>
          <p>Registration: ${certificateData.registration_no}</p>
          <p>${certificateData.school} - ${certificateData.course}</p>
          <p>Branch: ${certificateData.branch}</p>
          <p>Completed: ${new Date(certificateData.completionDate).toLocaleDateString()}</p>
        </div>
        
        <p>You can download your certificate from the link below:</p>
        <a href="${certificateData.verificationUrl}" class="btn">Download Certificate</a>
        
        <p><strong>Certificate ID:</strong> ${certificateData.certificateId}</p>
        <p><small>This certificate is verified and stored on blockchain for authenticity.</small></p>
      </div>
      
      <div class="footer">
        <p>This is an automated message from JECRC No Dues System.</p>
        <p>For any queries, please contact the administration.</p>
      </div>
    </body>
    </html>
  `;

  // Log email attempt
  const logEntry = await logEmail({
    emailType: EMAIL_TYPES.CERTIFICATE_SENT,
    recipientEmail: studentEmail,
    subject,
    body: html
  });

  try {
    const result = await sendEmail({
      to: studentEmail,
      subject,
      html
    });

    // Update log with success
    if (logEntry) {
      await updateEmailLog(logEntry.id, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });
    }

    // Update certificate record
    if (certificateData.id) {
      await getSupabase()
        .from('certificates')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', certificateData.id);
    }

    return result;
  } catch (error) {
    // Update log with error
    if (logEntry) {
      await updateEmailLog(logEntry.id, {
        status: 'failed',
        errorMessage: error.message
      });
    }
    throw error;
  }
}

/**
 * Get email statistics for dashboard
 */
async function getEmailStats(startDate, endDate) {
  try {
    const { data, error } = await getSupabase()
      .from('email_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const stats = {
      total: data.length,
      sent: data.filter(log => log.status === 'sent').length,
      failed: data.filter(log => log.status === 'failed').length,
      pending: data.filter(log => log.status === 'pending').length,
      byType: data.reduce((acc, log) => {
        acc[log.email_type] = (acc[log.email_type] || 0) + 1;
        return acc;
      }, {})
    };

    return stats;
  } catch (error) {
    console.error('Failed to get email stats:', error);
    return null;
  }
}

// Export all functions
export default {
  sendEmail,
  sendDailyDepartmentDigest,
  sendRejectionNotification,
  sendStudentStatusUpdate,
  sendReapplicationConfirmation,
  sendCertificateReadyNotification,
  sendOtpEmail,
  sendCertificateEmail,
  logEmail,
  updateEmailLog,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  getEmailStats,
  EMAIL_TYPES
};

/**
 * Send OTP Verification Email to Student
 * @param {Object} params - OTP parameters
 * @returns {Promise<Object>} - Email send result
 */
export async function sendOtpEmail({ to, studentName, otp }) {
  const content = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="background-color: #f3f4f6; display: inline-block; padding: 16px; border-radius: 50%; margin-bottom: 20px;">
        <span style="font-size: 32px;">🔐</span>
      </div>
      
      <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">Login Verification</h2>
      
      <p style="color: #4b5563; font-size: 16px; margin: 0 0 24px 0;">
        Hello <strong>${studentName || 'Student'}</strong>,<br>
        Use the code below to securely access your No Dues dashboard.
      </p>
      
      <div style="background-color: #ffffff; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 24px; display: inline-block; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #dc2626;">${otp}</span>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        This code will expire in 10 minutes.<br>
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `;

  const html = generateEmailTemplate({
    title: 'Your Login OTP',
    content,
    actionUrl: '', // No button needed for OTP
    actionText: '',
    footerText: 'This is a secure authentication message. Do not share this code.'
  });

  return sendEmail({
    to,
    subject: `🔐 Your Login OTP: ${otp}`,
    html,
    metadata: { type: 'otp_verification' }
  });
}
;
