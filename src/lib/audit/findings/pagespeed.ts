// Finding extraction — PageSpeed Insights → Finding[]
//
// Transforms the raw PSI audit entries into the canonical Finding schema.
//
// Each Lighthouse audit maps to one Finding with:
//   - severity: derived from the audit's score
//   - category: derived from which Lighthouse category the audit belongs to
//   - status: null on first run (no baseline to compare against)
//
// Severity mapping (FR-41, Doc-03 enum FindingSeverity):
//   score >= 0.9           → PASSED
//   0.5 <= score < 0.9     → WARNING
//   0 <= score < 0.5       → CRITICAL
//   score === null, or scoreDisplayMode is informative/notApplicable/manual → INFO
//
// Category mapping (Doc-03 enum FindingCategory):
//   performance category   → PERFORMANCE
//   accessibility category → ACCESSIBILITY
//   best-practices category → BEST_PRACTICES
//   seo category           → SEO
//   (audits in multiple or no categories: skip — would create duplicates)
//
// Source tag: "pagespeed-insights"

import type { PSILighthouseResult } from "@/lib/services/pagespeed";

const SOURCE = "pagespeed-insights";

// These scoreDisplayModes have no meaningful pass/fail score.
const INFORMATIONAL_MODES = new Set([
  "informative",
  "notApplicable",
  "manual",
  "error",
]);

// Map from Lighthouse category ID → our DB enum value
const CATEGORY_MAP: Record<string, string> = {
  performance: "PERFORMANCE",
  accessibility: "ACCESSIBILITY",
  "best-practices": "BEST_PRACTICES",
  seo: "SEO",
};

export type NormalizedFinding = {
  key: string;
  title: string;
  severity: "CRITICAL" | "WARNING" | "INFO" | "PASSED";
  category: "PERFORMANCE" | "ACCESSIBILITY" | "BEST_PRACTICES" | "SEO" | "STRUCTURED_DATA";
  source: string;
  status: null; // Always null on first run; comparison runs will set NEW/RECURRING/RESOLVED
  displayValue: string | null;
};

/**
 * Build a map of auditId → category enum value.
 * If an audit appears in multiple categories, the first match wins.
 * Audits not in any category are omitted (they won't produce findings).
 */
function buildAuditCategoryMap(
  lhr: PSILighthouseResult,
): Map<string, NormalizedFinding["category"]> {
  const map = new Map<string, NormalizedFinding["category"]>();

  for (const [catId, cat] of Object.entries(lhr.categories)) {
    const dbCategory = CATEGORY_MAP[catId];
    if (!dbCategory || !cat?.auditRefs) continue;

    for (const ref of cat.auditRefs) {
      if (!map.has(ref.id)) {
        map.set(ref.id, dbCategory as NormalizedFinding["category"]);
      }
    }
  }

  return map;
}

function deriveSeverity(
  score: number | null,
  scoreDisplayMode: string,
): NormalizedFinding["severity"] {
  if (INFORMATIONAL_MODES.has(scoreDisplayMode) || score === null) {
    return "INFO";
  }
  if (score >= 0.9) return "PASSED";
  if (score >= 0.5) return "WARNING";
  return "CRITICAL";
}

/**
 * Extract all findings from a PSI lighthouseResult.
 * Returns NormalizedFinding[] ready to be inserted into the DB.
 *
 * Audits with no category mapping are skipped (they have no grouping context).
 * PASSED informational audits (score === 1, scoreDisplayMode === 'notApplicable')
 * are included as INFO to provide full audit coverage.
 */
export function extractPageSpeedFindings(
  lhr: PSILighthouseResult,
): NormalizedFinding[] {
  const auditCategoryMap = buildAuditCategoryMap(lhr);
  const findings: NormalizedFinding[] = [];

  for (const [auditId, audit] of Object.entries(lhr.audits)) {
    const category = auditCategoryMap.get(auditId);
    if (!category) continue; // Skip audits not in any Lighthouse category

    findings.push({
      key: auditId,
      title: audit.title,
      severity: deriveSeverity(audit.score, audit.scoreDisplayMode),
      category,
      source: SOURCE,
      status: null,
      displayValue: audit.displayValue ?? null,
    });
  }

  return findings;
}
