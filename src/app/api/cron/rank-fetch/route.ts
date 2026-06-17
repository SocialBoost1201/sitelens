// GET /api/cron/rank-fetch
// Called by Vercel Cron or external scheduler. Fetches current rank for every
// enabled TrackedKeyword whose next check is due (cadence is config-driven,
// default weekly), persists a snapshot, and updates the keyword summary.
//
// Fail-closed auth (Bearer CRON_SECRET), identical to the other cron routes.
// Per-keyword failures are captured (allSettled) and reported — never silent.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchAndStoreRank } from "@/lib/rank/fetch-and-store"
import { fetchCadenceHours } from "@/lib/rank/plan-limits"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: keywords, error } = await admin
    .from("TrackedKeyword")
    .select("id, keyword, targetUrl, country, language, device, enabled, lastCheckedAt")
    .eq("enabled", true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cadenceMs = fetchCadenceHours() * 60 * 60 * 1000
  const now = Date.now()
  const due = (keywords ?? []).filter((k) => {
    if (!k.lastCheckedAt) return true
    return now - new Date(k.lastCheckedAt).getTime() >= cadenceMs
  })

  const results = await Promise.allSettled(
    due.map((k) =>
      fetchAndStoreRank(admin, {
        id: k.id,
        keyword: k.keyword,
        targetUrl: k.targetUrl,
        country: k.country,
        language: k.language,
        device: k.device,
      }),
    ),
  )

  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? { keywordId: due[i].id, position: r.value.position }
      : { keywordId: due[i].id, error: (r.reason as Error).message },
  )
  const failed = summary.filter((s) => "error" in s).length

  return NextResponse.json({ due: due.length, failed, summary })
}
