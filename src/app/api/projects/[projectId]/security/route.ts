// POST /api/projects/[projectId]/security
// Scans HTTP security headers for the project URL.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { scanSecurity } from "@/lib/services/security-scanner"
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
    const result = await scanSecurity(targetUrl)
    const admin = createAdminClient()
    const id = crypto.randomUUID()

    await admin.from("SecurityResult").insert({
      id,
      projectId,
      url: targetUrl,
      scannedAt: result.scannedAt,
      grade: result.grade,
      score: result.score,
      data: result as unknown as import("@/lib/supabase/database.types").Json,
    })

    return NextResponse.json({ id, grade: result.grade, score: result.score, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Security scan failed"
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
    .from("SecurityResult")
    .select("id, url, scannedAt, grade, score, data")
    .eq("projectId", projectId)
    .order("scannedAt", { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
