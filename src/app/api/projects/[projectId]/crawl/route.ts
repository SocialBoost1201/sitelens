// POST /api/projects/[projectId]/crawl
//
// Triggers a sitemap crawl for the given project.
// Discovered URLs are upserted into the PageUrl table.
// Returns { count, source, urls[] }.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { crawlSiteUrls } from "@/lib/services/crawler"
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  // ── Auth check ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Fetch project (RLS ensures ownership) ───────────────────────
  const { data: project, error: projectError } = await supabase
    .from("Project")
    .select("id, url")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // ── Crawl ────────────────────────────────────────────────────────
  let crawlResult
  try {
    const targetUrl = await assertSafeExternalHttpUrl(project.url)
    crawlResult = await crawlSiteUrls(targetUrl)
  } catch (err) {
    if (isUnsafeExternalUrlError(err)) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : "Crawl failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // ── Upsert URLs via admin client (bypasses RLS) ──────────────────
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const rows = crawlResult.urls.map((url) => ({
    id: crypto.randomUUID(),
    projectId,
    url,
    discoveredAt: now,
  }))

  // Upsert in batches of 100
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    await admin
      .from("PageUrl")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "projectId,url", ignoreDuplicates: true })
  }

  return NextResponse.json({
    count: crawlResult.urls.length,
    source: crawlResult.source,
    sitemapUrl: crawlResult.sitemapUrl ?? null,
    urls: crawlResult.urls.slice(0, 20), // preview only
  })
}
