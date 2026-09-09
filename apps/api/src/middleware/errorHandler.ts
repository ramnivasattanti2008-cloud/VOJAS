import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@vojas/domain';
import { logger } from '../utils/logger.js';

// Fields that must never appear in error responses or logs
const REDACTED_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'sessionId',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
];

/**
 * Recursively redact sensitive fields from an object.
 * Returns a new object — never mutates the input.
 */
function redact<T>(value: T, depth = 0): T {
  if (depth > 5) return value;
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as unknown as T;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = k.toLowerCase();
    if (REDACTED_FIELDS.some((f) => lowerKey.includes(f.toLowerCase()))) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out as T;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startedAt?: number;
    }
  }
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isDev = process.env.NODE_ENV !== 'production';
  const requestId = req.requestId ?? 'unknown';
  const duration = req.startedAt ? Date.now() - req.startedAt : undefined;

  // Known, expected error — log at warn level
  if (err instanceof AppError) {
    logger.warn('Request failed with known error', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      durationMs: duration,
    });
    res.status(err.statusCode).json({
      success: false,
      requestId,
      ...err.toJSON(),
    });
    return;
  }

  // express.json() throws a SyntaxError with status 400 for malformed request
  // bodies — this is bad client input, not a server fault.
  if (err instanceof SyntaxError && (err as { status?: number }).status === 400 && 'body' in err) {
    logger.warn('Malformed request body', {
      requestId,
      method: req.method,
      path: req.path,
    });
    res.status(400).json({
      success: false,
      requestId,
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON in request body' },
    });
    return;
  }

  // Prisma known errors — log as warn (data not available, conflict, etc.)
  const errCode = (err as { code?: string }).code;
  if (typeof errCode === 'string' && errCode.startsWith('P')) {
    const statusCode = errCode === 'P2025' ? 404 : 400;
    logger.warn('Database error', {
      requestId,
      method: req.method,
      path: req.path,
      prismaCode: errCode,
      message: err.message,
    });
    res.status(statusCode).json({
      success: false,
      requestId,
      error: {
        code: errCode === 'P2025' ? 'NOT_FOUND' : 'DATABASE_ERROR',
        message: 'The requested operation could not be completed',
      },
    });
    return;
  }

  // Unexpected error — log full detail server-side, but NEVER expose to client
  logger.error('Unhandled error', {
    requestId,
    method: req.method,
    path: req.path,
    name: err.name,
    message: err.message,
    stack: isDev ? err.stack : undefined,
    durationMs: duration,
  });

  // Redact body for safe logging
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body (redacted)', {
      requestId,
      body: redact(req.body),
    });
  }

  res.status(500).json({
    success: false,
    requestId,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    requestId: req.requestId,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}
