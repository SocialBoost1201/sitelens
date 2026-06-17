// DataForSEO adapter for rank tracking (Doc-11 / BL-01, OQ-11-1).
//
// Implements RankProvider.fetchRank against DataForSEO's Google Organic SERP API.
// All DataForSEO-specific shapes (endpoints, location names, response parsing)
// are contained HERE so the DB/UI never depend on the vendor.
//
// Credentials come from env ONLY (never hardcoded):
//   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
// If they are absent, fetchRank throws a clear error — callers surface it
// (cron records a failed fetch, manual refresh returns 500). Never silent.

import type { RankQuery, RankResult } from "../rank-tracker"

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced"

// Minimal country-code → DataForSEO location_name map (adapter-internal only).
// Extend as needed; unknown codes fall back to United States.
const LOCATION_BY_COUNTRY: Record<string, string> = {
  us: "United States",
  jp: "Japan",
  gb: "United Kingdom",
  uk: "United Kingdom",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
}

interface DfsOrganicItem {
  type?: string
  rank_absolute?: number
  rank_group?: number
  url?: string
  domain?: string
}

interface DfsResponse {
  tasks?: Array<{
    status_code?: number
    status_message?: string
    result?: Array<{
      item_types?: string[]
      items?: DfsOrganicItem[]
    }> | null
  }>
}

function hostOf(input: string): string {
  try {
    return new URL(input.includes("://") ? input : `https://${input}`).hostname.replace(/^www\./, "")
  } catch {
    return input.replace(/^www\./, "")
  }
}

export async function fetchDataForSeoRank(query: RankQuery): Promise<RankResult> {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured (set DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)")
  }

  const auth = Buffer.from(`${login}:${password}`).toString("base64")
  const locationName = LOCATION_BY_COUNTRY[query.country.toLowerCase()] ?? "United States"

  const payload = [
    {
      keyword: query.keyword,
      location_name: locationName,
      language_code: query.language,
      device: query.device.toLowerCase(),
      depth: 100,
    },
  ]

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`DataForSEO request failed: HTTP ${res.status}`)
  }

  const json = (await res.json()) as DfsResponse
  const task = json.tasks?.[0]
  if (task?.status_code && task.status_code >= 40000) {
    throw new Error(`DataForSEO task error: ${task.status_message ?? task.status_code}`)
  }

  const result = task?.result?.[0]
  const items = result?.items ?? []
  const targetHost = hostOf(query.targetUrl)

  const match = items
    .filter((it) => it.type === "organic")
    .find((it) => {
      const itemHost = it.domain ? it.domain.replace(/^www\./, "") : hostOf(it.url ?? "")
      return itemHost === targetHost
    })

  const serpFeatures: Record<string, unknown> = {
    itemTypes: result?.item_types ?? [],
    fetchedDepth: 100,
  }

  return {
    position: match?.rank_absolute ?? null,
    rankedUrl: match?.url ?? null,
    serpFeatures,
    source: "dataforseo",
  }
}
