/**
 * Simple structured logger. Avoids bringing in pino-winston for now.
 * Outputs JSON in production, colorised text in development.
 */
const isProd = process.env.NODE_ENV === 'production';

function format(level: string, msg: string, meta?: Record<string, unknown>): string {
  if (isProd) {
    return JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() });
  }
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${level.padEnd(5)}] ${msg}${metaStr}`;
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
    if (!isProd) {
      // eslint-disable-next-line no-console
      console.debug(format('DEBUG', msg, meta));
    }
  },
};
