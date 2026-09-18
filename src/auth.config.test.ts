import { describe, it, expect, vi } from 'vitest';
import { authConfig } from './auth.config';

describe('auth.config', () => {
  it('defines custom signIn page', () => {
    expect(authConfig.pages?.signIn).toBe('/login');
  });

  it('configures sessionToken cookie options', () => {
    expect(authConfig.cookies?.sessionToken?.options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
      })
    );
  });
});
