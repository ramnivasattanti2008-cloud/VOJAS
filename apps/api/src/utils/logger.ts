/**
 * Structured logger for VOJAS API.
 *
 * Production: JSON output (machine-readable, easy to ingest into ELK/Grafana/Papertrail)
 * Development: pretty-printed with color-coded levels
 *
 * Usage:
 *   logger.info('User logged in', { userId: '...', ip: req.ip });
 *   logger.error('Request failed', { requestId: req.requestId, err });
 *   logger.warn('Rate limit hit', { ip: req.ip, path: req.path });
 *
 * NEVER log: passwords, tokens, secrets, full request bodies (use redactForLog).
 */

const isProd = process.env.NODE_ENV === 'production';

function format(
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
  msg: string,
  meta?: Record<string, unknown>
): string {
  const ts = new Date().toISOString();

  // Standard log fields for ELK/Grafana ingestion
  const fields: Record<string, unknown> = {
    ts,
    level: level.toLowerCase(),
    msg,
    ...meta,
  };

  if (isProd) {
    return JSON.stringify(fields);
  }

  // Dev: pretty-printed
  const levelColors: Record<string, string> = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    DEBUG: '\x1b[90m',
  };
  const color = levelColors[level] ?? '';
  const reset = '\x1b[0m';
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 0)}` : '';
  return `${color}[${ts}] ${level.padEnd(5)} ${msg}${reset}${metaStr}`;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.log(format('INFO', msg, meta));
  },

  warn(msg: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.warn(format('WARN', msg, meta));
  },

  error(msg: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.error(format('ERROR', msg, meta));
  },

  debug(msg: string, meta?: Record<string, unknown>) {
    if (isProd) return;
    // eslint-disable-next-line no-console
    console.debug(format('DEBUG', msg, meta));
  },

  /**
   * Create a child logger with default fields pre-set (e.g. requestId).
   * Returns a new logger-like object — does NOT mutate the global.
   */
  withContext(defaults: Record<string, unknown>) {
    return {
      info: (msg: string, meta?: Record<string, unknown>) =>
        logger.info(msg, { ...defaults, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) =>
        logger.warn(msg, { ...defaults, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) =>
        logger.error(msg, { ...defaults, ...meta }),
      debug: (msg: string, meta?: Record<string, unknown>) =>
        logger.debug(msg, { ...defaults, ...meta }),
    };
  },
};
