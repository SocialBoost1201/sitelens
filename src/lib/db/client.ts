// Prisma Client singleton — serverless-safe pattern.
//
// Problem: Next.js hot-reload in development re-evaluates modules, creating a
// new PrismaClient instance on every reload. Each instance opens new DB
// connections, exhausting the pool quickly.
//
// Solution: store the client on `globalThis` in development so it survives
// module re-evaluation. In production, module-level singletons are safe
// because the process is not hot-reloaded.
//
// Prisma 7 requires a driver adapter for runtime connections.
// @prisma/adapter-pg wraps the `pg` Pool and handles pgBouncer compatibility.
// DATABASE_URL should point to Supabase's Transaction Pooler (port 6543).
//
// Usage:
//   import { db } from "@/lib/db/client";
//   const projects = await db.project.findMany();

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. " +
        "Set it in .env.local pointing to the Supabase Transaction Pooler (port 6543).",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Extend globalThis with a typed prisma slot for the dev singleton.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  // Persist across hot-reloads in development only.
  globalForPrisma.prisma = db;
}
