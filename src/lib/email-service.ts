import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ReactElement } from 'react';

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  react?: ReactElement;
}

type EmailProvider = 'smtp' | 'resend' | 'log';

function resolveProvider(): EmailProvider {
  const explicit = process.env['EMAIL_PROVIDER']?.toLowerCase();
  if (explicit === 'smtp' || explicit === 'resend' || explicit === 'log') return explicit;

  if (process.env['SMTP_HOST'] && process.env['SMTP_USER']) return 'smtp';
  if (process.env['RESEND_API_KEY']) return 'resend';
  return 'log';
}

function getFrom() {
  return (
    process.env['EMAIL_FROM'] ||
    process.env['RESEND_FROM_EMAIL'] ||
    'FIX-AI <onboarding@resend.dev>'
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

async function sendViaResend({ to, subject, text, html, react }: SendEmailParams) {
  const resend = new Resend(process.env['RESEND_API_KEY']);

  const { data, error } = await resend.emails.send({
    from: getFrom(),
    to: [to],
    subject,
    text: text || '',
    html: html,
    react: react,
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true, messageId: data?.id };
}

function logEmail({ to, subject, text, html }: SendEmailParams) {
  console.log('⚠️ [Email Service] No provider configured (set SMTP_* or RESEND_API_KEY). Email not sent, but logged to console.');
  
  
  
  if (html) console.log(`[HTML Content Provided: ${html.length} chars]`);
}

/**
 * Sends an email using the configured provider:
 *  - EMAIL_PROVIDER=smtp (or SMTP_HOST+SMTP_USER set) -> nodemailer SMTP (Gmail, etc.)
 *  - EMAIL_PROVIDER=resend (or RESEND_API_KEY set)    -> Resend SDK
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

  if (provider === 'resend') {
    try {
      const result = await sendViaResend(params);
      if (result.success) {
        console.log('✅ [Email Service] Email sent via Resend:', result.messageId);
      } else {
        console.error('❌ [Email Service] Resend API Error:', result.error);
      }
      return result;
    } catch (error) {
      console.error('❌ [Email Service] Unexpected Error:', error);
      return { success: false, error };
    }
  }

  logEmail(params);
  return { success: true, logged: true };
}
