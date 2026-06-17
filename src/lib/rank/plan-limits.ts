// Keyword tracking plan limits & cadence (Doc-11 / BL-01, OQ-11-2).
//
// These are CONFIG, not hardcoded business rules: each value can be overridden
// at runtime via an env var so limits can change without a code deploy. Defaults
// match the agreed MVP tiers. Nothing here touches scoring/thresholds/parsing.

export type PlanTier = "internal" | "starter" | "pro" | "agency"

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Max tracked keywords per project (per plan). Overridable via env. */
export const KEYWORD_LIMITS: Record<PlanTier, number> = {
  internal: envInt("RANK_LIMIT_INTERNAL", 10),
  starter: envInt("RANK_LIMIT_STARTER", 50),
  pro: envInt("RANK_LIMIT_PRO", 200),
  agency: envInt("RANK_LIMIT_AGENCY", 1000),
}

/**
 * Active plan tier. MVP has no billing system yet, so this is a single
 * env-driven value (default: internal). When billing lands, resolve per
 * project/account instead of reading this global.
 */
export function activePlanTier(): PlanTier {
  const raw = (process.env.RANK_PLAN_TIER ?? "internal").toLowerCase()
  if (raw === "starter" || raw === "pro" || raw === "agency") return raw
  return "internal"
}

/** Keyword cap for the active plan. */
export function keywordLimit(): number {
  return KEYWORD_LIMITS[activePlanTier()]
}

/**
 * Default fetch cadence in hours. MVP default = weekly (168h), overridable.
 * Used by the cron route to decide which keywords are "due".
 */
export function fetchCadenceHours(): number {
  return envInt("RANK_FETCH_CADENCE_HOURS", 168)
}
