import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client-side configuration.
 *
 * Works out-of-the-box without NEXT_PUBLIC_SENTRY_DSN (Sentry is a no-op when
 * the DSN is missing). When the DSN is set, all client-side errors and
 * performance spans are captured and forwarded to Sentry — with auth tokens
 * and cookies stripped before sending.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.05,
  replaysOnErrorSampleRate: 0.1,
  /**
   * beforeSend runs for every captured event — strip cookies and authorization
   * headers so no auth material ever reaches Sentry's servers.
   */
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>).authorization;
      delete (event.request.headers as Record<string, unknown>).cookie;
    }
    return event;
  },
});
