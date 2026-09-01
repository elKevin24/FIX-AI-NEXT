/**
 * Structured JSON Logger for FIX-AI NEXT
 * Enterprise Observability & APM Ready
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'authorization',
  'apikey',
  'cookie',
  'session_log_token',
  'otp',
  'creditcard',
]);

function redactSensitiveData(data: unknown, seen = new WeakSet<object>()): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (seen.has(data as object)) {
    return '[CIRCULAR]';
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value, seen);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  AUDIT: 35,
  ERROR: 40,
};

function getMinLogLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toUpperCase() as LogLevel;
  if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env['NODE_ENV'] === 'production' ? 'INFO' : 'DEBUG';
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const minLevel = getMinLogLevel();
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
    return;
  }

  const logEntry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env['NODE_ENV'] || 'development',
    service: 'fix-ai-next',
  };

  if (context) {
    const sanitizedContext = redactSensitiveData(context) as Record<string, unknown>;
    Object.assign(logEntry, sanitizedContext);
  }

  if (error) {
    if (error instanceof Error) {
      logEntry['error'] = {
        name: error.name,
        message: error.message,
        stack: process.env['NODE_ENV'] !== 'production' ? error.stack : undefined,
      };
    } else {
      logEntry['error'] = { message: String(error) };
    }
  }

  const output = JSON.stringify(logEntry);

  if (level === 'ERROR') {
    console.error(output);
  } else if (level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => formatLog('DEBUG', message, context),
  info: (message: string, context?: LogContext) => formatLog('INFO', message, context),
  warn: (message: string, context?: LogContext, error?: unknown) => formatLog('WARN', message, context, error),
  error: (message: string, context?: LogContext, error?: unknown) => formatLog('ERROR', message, context, error),
  audit: (message: string, context?: LogContext) => formatLog('AUDIT', message, context),
};
