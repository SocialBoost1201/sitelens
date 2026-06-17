// POST /api/projects/[projectId]/keywords/[keywordId]/refresh
// Manually fetch the current rank for a single keyword (RLS-scoped ownership).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { auditRateLimit } from "@/lib/ratelimit"
import { fetchAndStoreRank } from "@/lib/rank/fetch-and-store"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> },
) {
  const { projectId, keywordId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { success } = await auditRateLimit.limit(`${user.id}:${projectId}:rank-refresh`)
  if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })

  // Ownership + load the keyword via RLS-scoped client.
  const { data: kw } = await supabase
    .from("TrackedKeyword")
    .select("id, keyword, targetUrl, country, language, device")
    .eq("id", keywordId)
    .eq("projectId", projectId)
    .single()
  if (!kw) return NextResponse.json({ error: "Keyword not found" }, { status: 404 })

  try {
    const admin = createAdminClient()
    const out = await fetchAndStoreRank(admin, {
      id: kw.id,
      keyword: kw.keyword,
      targetUrl: kw.targetUrl,
      country: kw.country,
      language: kw.language,
      device: kw.device,
    })
    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rank fetch failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
