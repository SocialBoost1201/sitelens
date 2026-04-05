// Next.js 16 configuration — SiteLens
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const nextConfig: NextConfig = {
  // Fix the workspace root warning from Turbopack detecting multiple lockfiles
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation and project — set these in CI / Vercel env vars.
  // Leave empty during local dev; Sentry will still capture errors via DSN.
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",

  // Suppress upload noise when SENTRY_AUTH_TOKEN is not set (e.g. local dev)
  silent: !process.env.CI,

  // Disable source-map upload until an auth token is configured.
  // Set SENTRY_AUTH_TOKEN in CI to enable automatic upload.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
