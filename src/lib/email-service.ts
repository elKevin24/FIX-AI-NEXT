import { Resend } from 'resend';

// Initialize Resend with API Key from env
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email using Resend SDK
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  // Check if SDK is initialized
  if (!resend) {
    console.log('⚠️ [Resend Service] RESEND_API_KEY not found. Email not sent, but logged to console.');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    return { success: true, logged: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FIX-AI <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>'),
    });

    if (error) {
      console.error('❌ [Resend Service] API Error:', error);
      return { success: false, error };
    }

    console.log('✅ [Resend Service] Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ [Resend Service] Unexpected Error:', error);
    return { success: false, error };
  }
}
