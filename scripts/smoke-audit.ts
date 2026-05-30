#!/usr/bin/env tsx
// Audit pipeline smoke test — SiteLens
//
// Calls the live PageSpeed Insights API with a real URL, then runs the full
// normalize → findings pipeline and reports what would be written to the DB.
// No DB writes are performed — this is a read-only verification of the pipeline.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/smoke-audit.ts [url]
//
// Example:
//   npx tsx --env-file=.env.local scripts/smoke-audit.ts https://example.com

import { runPageSpeedAudit } from "../src/lib/services/pagespeed";
import { normalizePageSpeedMetrics } from "../src/lib/audit/normalize/pagespeed";
import { extractPageSpeedFindings } from "../src/lib/audit/findings/pagespeed";

const TARGET_URL = process.argv[2] ?? "https://example.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function header(title: string) {
  const bar = "─".repeat(60);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

function ok(msg: string) {
  console.log(`  ✓  ${msg}`);
}

function info(msg: string) {
  console.log(`     ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔍  SiteLens — Audit Pipeline Smoke Test");
  console.log(`   Target : ${TARGET_URL}`);
  console.log(`   Strategy: MOBILE`);

  // 1. PSI API call
  header("Step 1 — PageSpeed Insights API");

  const t0 = Date.now();
  let psiResponse;
  try {
    psiResponse = await runPageSpeedAudit(TARGET_URL, "MOBILE");
  } catch (err) {
    console.error(`\n  ✗  PSI call failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  ok(`PSI response received in ${elapsed}s`);
  info(`response.id = "${psiResponse.id}"`);

  const cats = psiResponse.lighthouseResult.categories;
  const auditCount = Object.keys(psiResponse.lighthouseResult.audits).length;
  ok(`Categories present: ${Object.keys(cats).join(", ")}`);
  ok(`Audits in response: ${auditCount}`);

  // 2. Normalize metrics
  header("Step 2 — Normalize Metrics");

  const metrics = normalizePageSpeedMetrics(psiResponse.lighthouseResult);
  ok(`Metrics extracted: ${metrics.length}`);

  for (const m of metrics) {
    const val = m.unit === "score" ? `${m.value}/100` : `${m.value.toFixed(0)} ${m.unit}`;
    info(`${m.key.padEnd(16)} ${val}`);
  }

  // Validate required keys exist
  const requiredKeys = ["performance", "lcp", "cls", "fcp"];
  const missingKeys = requiredKeys.filter((k) => !metrics.find((m) => m.key === k));
  if (missingKeys.length > 0) {
    console.error(`\n  ✗  Missing required metric keys: ${missingKeys.join(", ")}`);
    process.exit(1);
  }
  ok(`All required metric keys present`);

  // 3. Extract findings
  header("Step 3 — Extract Findings");

  const findings = extractPageSpeedFindings(psiResponse.lighthouseResult);
  ok(`Findings extracted: ${findings.length}`);

  const bySeverity = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  for (const [severity, count] of Object.entries(bySeverity)) {
    info(`${severity.padEnd(12)} ${count}`);
  }

  const criticals = findings.filter((f) => f.severity === "CRITICAL");
  if (criticals.length > 0) {
    ok(`Sample CRITICAL findings:`);
    for (const f of criticals.slice(0, 3)) {
      info(`[${f.category}] ${f.key}: ${f.title}`);
    }
  }

  // 4. Summary
  header("Summary — DB Write Simulation");

  console.log(`
  These rows would be inserted into the DB:

  Metric          ${metrics.length} rows
  Finding         ${findings.length} rows
  AlertViolation  (depends on project's AlertRule config)

  AuditRun status would transition:
    PENDING → RUNNING → COMPLETED
  `);

  console.log("  ✅  Pipeline smoke test PASSED\n");
}

main().catch((err) => {
  console.error("\n  ✗  Unhandled error:", err);
  process.exit(1);
});
