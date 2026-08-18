import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail } from '@/lib/email-service';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe('email-service provider resolution', () => {
  it('usa modo log cuando no hay proveedor configurado', async () => {
    delete process.env['SMTP_HOST'];
    delete process.env['SMTP_USER'];
    delete process.env['RESEND_API_KEY'];
    delete process.env['EMAIL_PROVIDER'];

    const { sendEmail: logSend } = await import('@/lib/email-service');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await logSend({ to: 'a@b.com', subject: 'Test', text: 'hi' });
    logSpy.mockRestore();

    expect(result).toEqual({ success: true, logged: true });
  });

  it('prioriza EMAIL_PROVIDER=log aunque haya SMTP', async () => {
    process.env['SMTP_HOST'] = 'smtp.gmail.com';
    process.env['SMTP_USER'] = 'x@gmail.com';
    process.env['EMAIL_PROVIDER'] = 'log';

    const { sendEmail: logSend } = await import('@/lib/email-service');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await logSend({ to: 'a@b.com', subject: 'Test', text: 'hi' });
    logSpy.mockRestore();

    expect(result).toEqual({ success: true, logged: true });
  });
});
