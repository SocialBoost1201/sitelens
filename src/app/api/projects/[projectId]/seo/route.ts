// POST /api/projects/[projectId]/seo
// Runs SEO analysis on the project URL (or a provided page URL).
// Upserts the result into the SeoResult table.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeSeo } from "@/lib/services/seo-analyzer"
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: project, error } = await supabase
    .from("Project").select("id, url").eq("id", projectId).single()
  if (error || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  let targetUrl: string
  try {
    targetUrl = await assertSafeExternalHttpUrl(
      typeof body.url === "string" ? body.url : project.url,
    )
  } catch (error) {
    if (isUnsafeExternalUrlError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const result = await analyzeSeo(targetUrl)
    const admin = createAdminClient()
    const id = crypto.randomUUID()

    await admin.from("SeoResult").insert({
      id,
      projectId,
      url: targetUrl,
      analyzedAt: result.analyzedAt,
      score: result.score,
      data: result as unknown as import("@/lib/supabase/database.types").Json,
    })

    return NextResponse.json({ id, score: result.score, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SEO analysis failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("SeoResult")
    .select("id, url, analyzedAt, score, data")
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
