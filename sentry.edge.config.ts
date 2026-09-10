import * as Sentry from '@sentry/nextjs';

/**
 * Sentry edge runtime configuration (used by middleware).
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.05,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>).authorization;
      delete (event.request.headers as Record<string, unknown>).cookie;
    }
    return event;
  },
});
