import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('Structured Logger (src/lib/logger.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive fields like passwords, tokens, and secrets', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('User login event', {
      userId: 'u-123',
      password: 'super-secret-password',
      token: 'jwt-token-xyz',
      nested: {
        apiKey: 'secret-key-abc',
        publicField: 'safe-value',
      },
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const loggedJson = JSON.parse(firstCall![0] as string);

    expect(loggedJson.level).toBe('INFO');
    expect(loggedJson.message).toBe('User login event');
    expect(loggedJson.userId).toBe('u-123');
    expect(loggedJson.password).toBe('[REDACTED]');
    expect(loggedJson.token).toBe('[REDACTED]');
    expect(loggedJson.nested.apiKey).toBe('[REDACTED]');
    expect(loggedJson.nested.publicField).toBe('safe-value');
  });

  it('handles circular references gracefully without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;

    expect(() => {
      logger.info('Circular log', { context: circularObj });
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const loggedJson = JSON.parse(firstCall![0] as string);
    expect(loggedJson.context.self).toBe('[CIRCULAR]');
  });

  it('formats Error objects properly in error level', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Database connection failed');
    logger.error('CRITICAL DB ERROR', { tenantId: 't-1' }, error);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const loggedJson = JSON.parse(firstCall![0] as string);

    expect(loggedJson.level).toBe('ERROR');
    expect(loggedJson.message).toBe('CRITICAL DB ERROR');
    expect(loggedJson.tenantId).toBe('t-1');
    expect(loggedJson.error.message).toBe('Database connection failed');
  });
});
