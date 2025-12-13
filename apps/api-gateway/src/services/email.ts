// apps/api-gateway/src/services/email.ts

import nodemailer from 'nodemailer';
import { loadSecrets } from '../config/secrets';
import { logger } from '../observability/logger';

/**
 * Email service for sending organization invitations and notifications
 * SMTP configuration is optional - service will gracefully handle missing config
 * E-posta gönderme servisi - SMTP yapılandırması opsiyonel, eksik config durumunda hata vermez
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter if SMTP config is available
 * SMTP yapılandırması varsa e-posta transporter'ını başlat
 */
function initializeTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const secrets = loadSecrets();

  // Check if SMTP is configured / SMTP yapılandırılmış mı kontrol et
  if (!secrets.smtpHost || !secrets.smtpUser || !secrets.smtpPassword) {
    logger.warn('SMTP configuration not available, email service disabled');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: secrets.smtpHost,
      port: 587, // Default SMTP port / Varsayılan SMTP portu
      secure: false, // Use TLS / TLS kullan
      auth: {
        user: secrets.smtpUser,
        pass: secrets.smtpPassword
      }
    });

    logger.info('Email transporter initialized successfully');
    return transporter;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize email transporter');
    return null;
  }
}

/**
 * Send an email
 * E-posta gönder
 * @param options Email options / E-posta seçenekleri
 * @returns Promise that resolves to true if sent, false if skipped
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const emailTransporter = initializeTransporter();

  if (!emailTransporter) {
    logger.warn('Email service not available, skipping email send');
    return false;
  }

  try {
    await emailTransporter.sendMail({
      from: `"AI Chat Platform" <${loadSecrets().smtpUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version / HTML'i temizle
    });

    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to, subject: options.subject }, 'Failed to send email');
    // Don't throw - allow calling code to continue / Hata fırlatma, çağıran kodun devam etmesine izin ver
    return false;
  }
}

/**
 * Send organization invitation email
 * Organizasyon davet e-postası gönder
 * @param email Recipient email / Alıcı e-posta
 * @param orgName Organization name / Organizasyon adı
 * @param inviterName Name of the person sending the invitation / Daveti gönderen kişinin adı
 * @param token Invitation token / Davet token'ı
 * @param expiresAt Expiration date / Son kullanma tarihi
 * @param baseUrl Base URL for the application / Uygulama temel URL'i
 */
export async function sendInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  token: string,
  expiresAt: Date,
  baseUrl: string = process.env.APP_BASE_URL || 'http://localhost:3000'
): Promise<boolean> {
  const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${token}`;
  const expiresDate = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>You've been invited!</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on the AI Chat Platform.</p>
        <p>Click the button below to accept the invitation and create your account:</p>
        <div style="text-align: center;">
          <a href="${invitationUrl}" class="button">Accept Invitation</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">${invitationUrl}</p>
        <p><strong>This invitation expires on ${expiresDate}.</strong></p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <div class="footer">
          <p>This is an automated message from the AI Chat Platform. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello,

${inviterName} has invited you to join ${orgName} on the AI Chat Platform.

Accept the invitation by visiting:
${invitationUrl}

This invitation expires on ${expiresDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
This is an automated message from the AI Chat Platform.
  `;

  return sendEmail({
    to: email,
    subject: `Invitation to join ${orgName}`,
    html,
    text
  });
}
