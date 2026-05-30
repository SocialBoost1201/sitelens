#!/usr/bin/env tsx
// Upstash Redis 接続テスト — SiteLens
// Usage: npx tsx --env-file=.env.local scripts/smoke-ratelimit.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

async function main() {
  console.log("\n🔍  Upstash Redis — 接続テスト\n");

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error("✗  UPSTASH_REDIS_REST_URL または UPSTASH_REDIS_REST_TOKEN が未設定です");
    process.exit(1);
  }

  console.log(`  URL: ${url}`);

  // Redis 接続確認
  const redis = new Redis({ url, token });
  const pong = await redis.ping();
  console.log(`  PING → ${pong}`);

  // レート制限テスト (テスト用: 3回/10秒)
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(3, "10 s"),
    prefix: "sitelens:test",
  });

  console.log("\n  レート制限テスト (3回/10秒):\n");
  for (let i = 1; i <= 4; i++) {
    const { success, remaining, reset } = await limiter.limit("test-user");
    const icon = success ? "✓" : "✗";
    const status = success ? "許可" : "拒否 (429)";
    console.log(`  [${i}回目] ${icon} ${status}  残り=${remaining}  リセット=${new Date(reset).toLocaleTimeString("ja-JP")}`);
  }

  console.log("\n  ✅  Upstash Redis 正常動作確認\n");
}

main().catch((err) => {
  console.error("\n  ✗  エラー:", err.message ?? err);
  process.exit(1);
});
