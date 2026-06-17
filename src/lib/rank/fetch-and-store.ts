// Shared rank fetch+persist (Doc-11 / BL-01). Used by the manual-refresh route
// and the cron route so the write path lives in exactly one place.
//
// On success: inserts a KeywordRankSnapshot and updates the TrackedKeyword summary.
// On provider failure: throws — callers must surface it (no silent failure, FR-24).

import type { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/lib/supabase/database.types"
import { fetchRank } from "@/lib/services/rank-tracker"

type AdminClient = ReturnType<typeof createAdminClient>

export interface KeywordForFetch {
  id: string
  keyword: string
  targetUrl: string
  country: string
  language: string
  device: "DESKTOP" | "MOBILE"
}

export async function fetchAndStoreRank(admin: AdminClient, kw: KeywordForFetch) {
  const result = await fetchRank({
    keyword: kw.keyword,
    targetUrl: kw.targetUrl,
    country: kw.country,
    language: kw.language,
    device: kw.device,
  })

  await admin.from("KeywordRankSnapshot").insert({
    id: crypto.randomUUID(),
    keywordId: kw.id,
    position: result.position,
    rankedUrl: result.rankedUrl,
    serpFeatures: result.serpFeatures as unknown as Json,
    source: result.source,
  })

  await admin
    .from("TrackedKeyword")
    .update({ lastCheckedAt: new Date().toISOString(), lastPosition: result.position })
    .eq("id", kw.id)

  return { keywordId: kw.id, position: result.position, source: result.source }
}
