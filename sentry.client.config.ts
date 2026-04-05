// Sentry client-side instrumentation — SiteLens
// This file is loaded by Next.js in the browser automatically when
// `@sentry/nextjs` is configured in `next.config.ts`.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing — adjust sample rate before going to production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session Replay — only enable in production to avoid noise
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,

  // Suppress console noise in development
  debug: false,
});
