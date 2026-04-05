// Metric normalization — PageSpeed Insights → Metric[]
//
// Transforms the raw PSI API response into the canonical Metric schema.
// Each Metric row stores: key, value (numeric), unit, and source tag.
//
// Category scores are scaled to 0–100 (PSI returns 0.0–1.0).
// Timing metrics are stored in their native units (ms or ratio).
//
// Canonical source tag: "pagespeed-insights"
// Canonical Metric keys (used by AlertRule.metric and thresholds.ts):
//   "performance"    score 0–100
//   "accessibility"  score 0–100
//   "best-practices" score 0–100
//   "seo"            score 0–100
//   "lcp"            ms  (Largest Contentful Paint)
//   "fcp"            ms  (First Contentful Paint)
//   "cls"            ratio (Cumulative Layout Shift, no unit)
//   "tbt"            ms  (Total Blocking Time)
//   "inp"            ms  (Interaction to Next Paint — if present)
//   "speed-index"    ms
//   "tti"            ms  (Time to Interactive)

import type { PSILighthouseResult } from "@/lib/services/pagespeed";

const SOURCE = "pagespeed-insights";

// Mapping from canonical metric key → PSI audit ID for core web vitals / timings
const TIMING_METRICS: Array<{ key: string; auditId: string; unit: string }> = [
  { key: "lcp", auditId: "largest-contentful-paint", unit: "ms" },
  { key: "fcp", auditId: "first-contentful-paint", unit: "ms" },
  { key: "cls", auditId: "cumulative-layout-shift", unit: "ratio" },
  { key: "tbt", auditId: "total-blocking-time", unit: "ms" },
  { key: "inp", auditId: "interaction-to-next-paint", unit: "ms" },
  { key: "speed-index", auditId: "speed-index", unit: "ms" },
  { key: "tti", auditId: "interactive", unit: "ms" },
];

export type NormalizedMetric = {
  key: string;
  value: number;
  unit: string;
  source: string;
};

/**
 * Extract all metrics from a PSI lighthouseResult.
 * Returns an array of NormalizedMetric ready to be inserted into the DB.
 * Metrics with null scores or missing audits are silently skipped.
 */
export function normalizePageSpeedMetrics(
  lhr: PSILighthouseResult,
): NormalizedMetric[] {
  const metrics: NormalizedMetric[] = [];

  // ─── Category scores (0–100) ───────────────────────────────────────────────
  const categoryMap: Record<string, keyof typeof lhr.categories> = {
    performance: "performance",
    accessibility: "accessibility",
    "best-practices": "best-practices",
    seo: "seo",
  };

  for (const [key, catId] of Object.entries(categoryMap)) {
    const cat = lhr.categories[catId as keyof typeof lhr.categories];
    if (cat?.score != null) {
      metrics.push({
        key,
        value: Math.round(cat.score * 100),
        unit: "score",
        source: SOURCE,
      });
    }
  }

  // ─── Timing / ratio metrics ────────────────────────────────────────────────
  for (const { key, auditId, unit } of TIMING_METRICS) {
    const audit = lhr.audits[auditId];
    if (audit?.numericValue != null) {
      metrics.push({
        key,
        value: audit.numericValue,
        unit,
        source: SOURCE,
      });
    }
  }

  return metrics;
}
