import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBaseUrl } from './app-url';

describe('getBaseUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env['NEXT_PUBLIC_APP_URL'];
    delete process.env['NEXTAUTH_URL'];
    delete process.env['VERCEL_PROJECT_PRODUCTION_URL'];
    delete process.env['VERCEL_URL'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses overrideUrl when passed as parameter', () => {
    expect(getBaseUrl('https://my-workshop.com/')).toBe('https://my-workshop.com');
  });

  it('uses NEXT_PUBLIC_APP_URL when configured', () => {
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.tallerfix.com/';
    expect(getBaseUrl()).toBe('https://app.tallerfix.com');
  });

  it('uses NEXTAUTH_URL when NEXT_PUBLIC_APP_URL is not set', () => {
    process.env['NEXTAUTH_URL'] = 'https://auth.tallerfix.com';
    expect(getBaseUrl()).toBe('https://auth.tallerfix.com');
  });

  it('auto-resolves VERCEL_PROJECT_PRODUCTION_URL', () => {
    process.env['VERCEL_PROJECT_PRODUCTION_URL'] = 'fix-ai-prod.vercel.app';
    expect(getBaseUrl()).toBe('https://fix-ai-prod.vercel.app');
  });

  it('auto-resolves VERCEL_URL preview deployments', () => {
    process.env['VERCEL_URL'] = 'fix-ai-git-branch.vercel.app';
    expect(getBaseUrl()).toBe('https://fix-ai-git-branch.vercel.app');
  });

  it('falls back to http://localhost:3000 in local development', () => {
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});
