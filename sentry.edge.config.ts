// Sentry edge-runtime instrumentation — SiteLens
// Loaded by Next.js for Edge runtime routes and middleware.
// Note: Node.js APIs (fs, crypto, etc.) are unavailable in the Edge runtime.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  debug: false,
});
