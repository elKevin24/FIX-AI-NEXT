import 'server-only';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { ReactElement } from 'react';

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  react?: ReactElement;
}

type EmailProvider = 'smtp' | 'log';

function resolveProvider(): EmailProvider {
  const explicit = process.env['EMAIL_PROVIDER']?.toLowerCase();
  if (explicit === 'smtp' || explicit === 'log') return explicit;

  if (process.env['SMTP_HOST'] && process.env['SMTP_USER']) return 'smtp';
  return 'log';
}

function getFrom() {
  return (
    process.env['EMAIL_FROM'] ||
    'FIX-AI <noreply@fix-ai.local>'
  );
}

async function sendViaSmtp({ to, subject, text, html, react }: SendEmailParams) {
  const htmlContent = html || (react ? await render(react) : undefined);
  const transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port: Number(process.env['SMTP_PORT']) || 587,
    secure: process.env['SMTP_SECURE'] === 'true',
    auth: {
      user: process.env['SMTP_USER'] || '',
      pass: process.env['SMTP_PASS'] || '',
    },
  });

  const info = await transporter.sendMail({
    from: getFrom(),
    to: [to],
    subject,
    text: text || '',
    html: htmlContent,
  });

  return { success: true, messageId: info.messageId };
}

function logEmail({ to, subject, text, html }: SendEmailParams) {
  console.log('⚠️ [Email Service] No SMTP provider configured (set SMTP_*). Email not sent, but logged to console.');
  console.log(`[Email Log] To: ${to} | Subject: "${subject}"`);
  if (text) console.log(`[Email Body] ${text}`);
  if (html) console.log(`[HTML Content Provided: ${html.length} chars]`);
}

/**
 * Sends an email using the configured provider:
 *  - EMAIL_PROVIDER=smtp (or SMTP_HOST+SMTP_USER set) -> nodemailer SMTP (Gmail, custom SMTP, etc.)
 *  - otherwise                                        -> log only
 */
export async function sendEmail(params: SendEmailParams) {
  const provider = resolveProvider();

  if (provider === 'smtp') {
    try {
      const result = await sendViaSmtp(params);
      console.log('✅ [Email Service] Email sent via SMTP:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ [Email Service] SMTP Error:', error);
      return { success: false, error };
    }
  }

  logEmail(params);
  return { success: true, logged: true };
}
