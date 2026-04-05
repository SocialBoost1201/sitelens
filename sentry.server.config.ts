// Sentry server-side instrumentation — SiteLens
// Loaded by Next.js for Node.js runtime (Server Components, Route Handlers).
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Tracing — keep low in production to control volume
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  debug: false,
});
