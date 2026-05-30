// Upstash rate-limit helper — SiteLens
//
// Provides two lazily-initialised rate-limit instances:
//   apiRateLimit   — general API protection (60 req/min per identifier)
//   auditRateLimit — audit trigger protection (5 req/hr per project+user pair)
//
// Lazy init: Redis clients are created on first use, not at import time.
// This means the app starts cleanly even when Upstash credentials are absent.
//
// Fail-open: if credentials are missing, limit() returns { success: true }
// so that missing Upstash config never breaks user-facing features.
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
// to activate real enforcement.
//
// Usage:
//   import { auditRateLimit } from "@/lib/ratelimit";
//   const { success } = await auditRateLimit.limit(`${userId}:${projectId}`);
//   if (!success) return new Response("Too Many Requests", { status: 429 });

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

// ─── Internal helpers ──────────────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function buildRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Shared pass-through when Upstash is not configured.
const PASS: LimitResult = {
  success: true,
  limit: Infinity,
  remaining: Infinity,
  reset: 0,
  pending: Promise.resolve(),
};

// ─── Lazy wrapper ──────────────────────────────────────────────────────────

class LazyRatelimit {
  private _instance: Ratelimit | null = null;
  private readonly _factory: () => Ratelimit;

  constructor(factory: () => Ratelimit) {
    this._factory = factory;
  }

  async limit(identifier: string): Promise<LimitResult> {
    if (!isConfigured()) return PASS;
    this._instance ??= this._factory();
    return this._instance.limit(identifier);
  }
}

// ─── Exported limiters ────────────────────────────────────────────────────

/** General API rate limiter — 60 requests per minute per identifier. */
export const apiRateLimit = new LazyRatelimit(() =>
  new Ratelimit({
    redis: buildRedis(),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "sitelens:api",
  }),
);

/**
 * Audit trigger rate limiter — 5 audit runs per hour per (user + project).
 * Identifier: `${userId}:${projectId}`
 */
export const auditRateLimit = new LazyRatelimit(() =>
  new Ratelimit({
    redis: buildRedis(),
    limiter: Ratelimit.fixedWindow(5, "1 h"),
    analytics: true,
    prefix: "sitelens:audit",
  }),
);
