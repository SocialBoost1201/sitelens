// Upstash rate-limit helper — SiteLens
// Centralised rate-limiter instances. Import the appropriate limiter in
// Route Handlers and API utilities that need request protection.
//
// Prerequisites:
//   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
//
// Usage:
//   import { apiRateLimit } from "@/lib/ratelimit";
//   const { success } = await apiRateLimit.limit(identifier);
//   if (!success) return new Response("Too Many Requests", { status: 429 });

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazily-initialised Redis client — avoids boot-time errors when env vars are absent.
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "[ratelimit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set. " +
        "See .env.example for required keys.",
    );
  }

  return new Redis({ url, token });
}

// ---------------------------------------------------------------------------
// General API rate limiter
// 60 requests per minute per identifier (IP address or user ID).
// ---------------------------------------------------------------------------
export const apiRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "sitelens:api",
});

// ---------------------------------------------------------------------------
// Audit trigger rate limiter
// 5 audit runs per hour per site — prevents runaway costs.
// ---------------------------------------------------------------------------
export const auditRateLimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.fixedWindow(5, "1 h"),
  analytics: true,
  prefix: "sitelens:audit",
});
