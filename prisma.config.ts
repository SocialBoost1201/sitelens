// Prisma configuration for SiteLens.
// Loads DATABASE_URL from .env.local first (Next.js convention), falling back to .env.
// See: https://pris.ly/prisma-config

import path from "path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention for secrets) — silent if absent
config({ path: path.resolve(process.cwd(), ".env.local") });
// Fallback to .env (Prisma CLI default) — silent if absent
config({ override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL bypasses pgBouncer — required for `prisma migrate dev` and DDL operations.
    // Falls back to DATABASE_URL if DIRECT_URL is not set (e.g., local dev without pgBouncer).
    // Runtime Prisma Client is configured separately via the pg adapter in src/lib/db/client.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
