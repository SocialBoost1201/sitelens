// Keyword rank improvement actions (Doc-11 / BL-01, OQ-11-3).
//
// Derives NON-SCORED recommendations from position movement. These are display
// hints only — they DO NOT contribute to any SEO score, Site Health score, or
// threshold. Rankings are not a scored axis at MVP (approval-gated).

export type RankSeverity = "critical" | "high" | "medium" | "low"

export interface RankRecommendation {
  keyword: string
  severity: RankSeverity
  title: string
  detail: string
  recommendation: string
}

export interface RankMovement {
  keyword: string
  /** Latest organic position, or null if not found in fetched depth. */
  current: number | null
  /** Previous organic position, or null if no prior snapshot / not found. */
  previous: number | null
}

const DROP_HIGH = 10 // positions lost → high severity
const DROP_MEDIUM = 3 // positions lost → medium severity
const RISE_NOTABLE = 3 // positions gained → surface as a positive low note

/**
 * Turn rank movements into non-scored recommendations, most urgent first.
 * Returns an empty array when nothing is actionable.
 */
export function deriveRankRecommendations(movements: RankMovement[]): RankRecommendation[] {
  const out: RankRecommendation[] = []

  for (const m of movements) {
    const wasRanked = m.previous != null
    const isRanked = m.current != null

    // Fell out of tracked results entirely.
    if (wasRanked && !isRanked) {
      out.push({
        keyword: m.keyword,
        severity: "high",
        title: `"${m.keyword}" dropped out of results`,
        detail: `Was ranked #${m.previous}, now outside the tracked depth.`,
        recommendation:
          "Check for deindexing, content changes, or a SERP layout shift. Review Search Console coverage for this query.",
      })
      continue
    }

    if (wasRanked && isRanked) {
      const delta = (m.current as number) - (m.previous as number) // +ve = worse
      if (delta >= DROP_HIGH) {
        out.push({
          keyword: m.keyword,
          severity: "high",
          title: `"${m.keyword}" fell ${delta} positions`,
          detail: `#${m.previous} → #${m.current}.`,
          recommendation:
            "Audit on-page relevance and freshness; compare against newly-ranking competitors for this query.",
        })
      } else if (delta >= DROP_MEDIUM) {
        out.push({
          keyword: m.keyword,
          severity: "medium",
          title: `"${m.keyword}" slipped ${delta} positions`,
          detail: `#${m.previous} → #${m.current}.`,
          recommendation: "Refresh the target page and check internal links pointing to it.",
        })
      } else if ((m.previous as number) - (m.current as number) >= RISE_NOTABLE) {
        out.push({
          keyword: m.keyword,
          severity: "low",
          title: `"${m.keyword}" improved`,
          detail: `#${m.previous} → #${m.current}.`,
          recommendation: "Keep the momentum: maintain freshness and monitor for further gains.",
        })
      }
      continue
    }

    // Never ranked yet (no prior, still not found).
    if (!wasRanked && !isRanked) {
      out.push({
        keyword: m.keyword,
        severity: "medium",
        title: `"${m.keyword}" not ranking yet`,
        detail: "No organic position found within the tracked depth.",
        recommendation:
          "Ensure a page targets this query with matching intent, and that it is indexed.",
      })
    }
  }

  const order: Record<RankSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
