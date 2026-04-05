// Threshold evaluation — AlertRule[] + Metric[] → AlertViolation[]
//
// Evaluates each enabled AlertRule for a project against the metrics
// produced by a completed audit run.
//
// AlertOperator semantics (FR-60, OQ-09 / Doc-03 Gap 4):
//   BELOW: violation when metric value < threshold  (e.g., performance < 80)
//   ABOVE: violation when metric value > threshold  (e.g., lcp > 2500 ms)
//   Strict inequality — equal to threshold is NOT a violation.
//
// Snapshot behaviour:
//   Each AlertViolation records the metric key, actual value, threshold, and
//   operator AT THE TIME OF THE RUN. Later edits to the AlertRule do not
//   alter historical violation records (Doc-03 Gap 7).

import type { NormalizedMetric } from "./normalize/pagespeed";

// ─── Input types ──────────────────────────────────────────────────────────────

export type AlertRuleRow = {
  id: string;
  metric: string;
  operator: "BELOW" | "ABOVE";
  threshold: number;
  enabled: boolean;
};

// ─── Output type ──────────────────────────────────────────────────────────────

export type AlertViolationPayload = {
  metricKey: string;
  actualValue: number;
  threshold: number;
  operator: "BELOW" | "ABOVE";
  alertRuleId: string;
};

/**
 * Evaluate all enabled alert rules against the metrics from a single audit run.
 *
 * @param rules   AlertRule rows for the project (only enabled rules are evaluated)
 * @param metrics Normalized metrics produced by this run
 * @returns       One AlertViolationPayload per breached rule
 */
export function evaluateThresholds(
  rules: AlertRuleRow[],
  metrics: NormalizedMetric[],
): AlertViolationPayload[] {
  // Index metrics by key for O(1) lookup
  const metricByKey = new Map<string, number>(
    metrics.map((m) => [m.key, m.value]),
  );

  const violations: AlertViolationPayload[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const actualValue = metricByKey.get(rule.metric);
    if (actualValue === undefined) {
      // The metric produced by this run doesn't include the key this rule
      // references. Skip silently — the rule may reference a V1 metric
      // (e.g., a Search Console metric) that isn't available yet.
      continue;
    }

    const isViolation =
      rule.operator === "BELOW"
        ? actualValue < rule.threshold
        : actualValue > rule.threshold;

    if (isViolation) {
      violations.push({
        metricKey: rule.metric,
        actualValue,
        threshold: rule.threshold,
        operator: rule.operator,
        alertRuleId: rule.id,
      });
    }
  }

  return violations;
}
