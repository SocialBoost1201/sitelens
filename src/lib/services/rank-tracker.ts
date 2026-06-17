// Provider-agnostic rank tracker (Doc-11 / BL-01, OQ-11-1).
//
// The rest of the app talks ONLY to this module — never to a specific vendor.
// DataForSEO is the MVP provider, but the DB schema and UI carry no DataForSEO-
// specific shapes, so swapping to SerpApi / Zenserp later is a single new adapter
// plus an env change (RANK_PROVIDER). No self-scraping is implemented.

import { fetchDataForSeoRank } from "./rank-providers/dataforseo"

export interface RankQuery {
  keyword: string
  /** The site/domain whose ranking we want (e.g. "https://example.com"). */
  targetUrl: string
  /** Location code, e.g. "us", "jp" (provider-neutral; adapter maps it). */
  country: string
  /** Language code, e.g. "en", "ja". */
  language: string
  device: "DESKTOP" | "MOBILE"
}

export interface RankResult {
  /** Organic position, or null if not found within the fetched depth. */
  position: number | null
  /** The URL that actually ranked for the target domain (may differ from targetUrl). */
  rankedUrl: string | null
  /** Raw SERP feature flags retained for traceability (NFR-30). Provider-neutral bag. */
  serpFeatures: Record<string, unknown>
  /** Provider tag stored on the snapshot (FR-80 source tagging). */
  source: string
}

export interface RankProvider {
  id: string
  fetchRank(query: RankQuery): Promise<RankResult>
}

/**
 * Resolve the active provider from env (default: dataforseo).
 * Add a case here when a new adapter is implemented.
 */
export function getRankProvider(): RankProvider {
  const id = (process.env.RANK_PROVIDER ?? "dataforseo").toLowerCase()
  switch (id) {
    case "dataforseo":
      return { id: "dataforseo", fetchRank: fetchDataForSeoRank }
    // case "serpapi":  return { id: "serpapi",  fetchRank: fetchSerpApiRank }
    // case "zenserp":  return { id: "zenserp",  fetchRank: fetchZenserpRank }
    default:
      throw new Error(`Unknown RANK_PROVIDER "${id}" (supported: dataforseo)`)
  }
}

/** Convenience: fetch a rank using the active provider. */
export async function fetchRank(query: RankQuery): Promise<RankResult> {
  return getRankProvider().fetchRank(query)
}
