/**
 * Request ID + structured logging middleware.
 *
 * Generates a UUID v4 for every incoming request, attaches it to req.requestId,
 * echoes it in the X-Request-Id response header (so clients can include it
 * in support requests), and produces a structured log line on completion.
 *
 * Sensitive fields (see redactor below) are never included in logs.
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const REDACT_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessionid',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'cookies',
  'whistleblowertoken',
  'accesstokenexp',
  'refreshtokenhash',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limited]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 500) return value.slice(0, 500) + '…[truncated]';
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) out[k] = '[REDACTED]';
    else out[k] = redact(v, depth + 1);
  }
  return out;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startedAt?: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Honor an incoming X-Request-Id (for distributed tracing) if present and safe
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && /^[A-Za-z0-9_\-]{1,64}$/.test(incoming)) {
    req.requestId = incoming;
  } else {
    req.requestId = crypto.randomUUID();
  }
  req.startedAt = Date.now();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const duration = req.startedAt ? Date.now() - req.startedAt : undefined;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const userId = (req as unknown as { user?: { userId?: string } }).user?.userId;
    const meta = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
      durationMs: duration,
      ...(userId ? { userId } : {}),
    };
    if (level === 'error') logger.error('Request completed', meta);
    else if (level === 'warn') logger.warn('Request completed', meta);
    else logger.info('Request completed', meta);
  });
  next();
}

export { redact as redactForLog };
