// POST /api/projects/[projectId]/links
// Checks for broken links on the project URL (or a provided page URL).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkBrokenLinks } from "@/lib/services/link-checker"
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
    const result = await checkBrokenLinks(targetUrl)
    const admin = createAdminClient()

    // Clear old results for this page, then insert new broken links
    await admin.from("BrokenLink")
      .delete()
      .eq("projectId", projectId)
      .eq("pageUrl", targetUrl)

    if (result.brokenLinks.length > 0) {
      await admin.from("BrokenLink").insert(
        result.brokenLinks.map((link) => ({
          id: crypto.randomUUID(),
          projectId,
          pageUrl: targetUrl,
          linkUrl: link.url,
          statusCode: link.statusCode,
          error: link.error,
          checkedAt: result.checkedAt,
        })),
      )
    }

    return NextResponse.json({
      totalLinks: result.totalLinks,
      summary: result.summary,
      brokenLinks: result.brokenLinks,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Link check failed"
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
    .from("BrokenLink")
    .select("id, pageUrl, linkUrl, statusCode, error, checkedAt")
    .eq("projectId", projectId)
    .order("checkedAt", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}
