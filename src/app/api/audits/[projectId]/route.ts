// Audit trigger Route Handler — POST /api/audits/[projectId]
//
// Triggers a PSI audit for the given project.
// Supports an optional JSON body:
//   { url?: string, pageId?: string }
//
// If `url` is provided, that URL is audited instead of the project root URL.
// If `pageId` is provided, PageUrl.lastAuditedAt and lastAuditRunId are updated
// after a successful run.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { execute } from "@/lib/audit/execute"
import { auditRateLimit } from "@/lib/ratelimit"
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  // ── Auth check ────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Rate limit: 5 audits per user+project per hour ───────────────
  const { success: rateLimitOk } = await auditRateLimit.limit(
    `${user.id}:${projectId}`,
  )
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many audit requests. Please wait before triggering another audit." },
      { status: 429 },
    )
  }

  // ── Parse optional body ───────────────────────────────────────────
  let targetUrl: string | null = null
  let pageId: string | null = null
  try {
    const body = await request.json().catch(() => ({}))
    targetUrl = typeof body.url === "string" ? body.url : null
    pageId = typeof body.pageId === "string" ? body.pageId : null
  } catch {
    // no body — use project root URL
  }

  // ── Fetch project (RLS enforces ownership) ────────────────────────
  const { data: project, error: projectError } = await supabase
    .from("Project")
    .select("id, url, userId")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or access denied." }, { status: 404 })
  }

  let auditUrl: string
  try {
    auditUrl = await assertSafeExternalHttpUrl(targetUrl ?? project.url)
  } catch (error) {
    if (isUnsafeExternalUrlError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  // ── Create AuditRun record (PENDING) ──────────────────────────────
  const now = new Date().toISOString()
  const auditRunId = crypto.randomUUID()

  const { error: insertError } = await supabase.from("AuditRun").insert({
    id: auditRunId,
    projectId,
    status: "PENDING",
    createdAt: now,
  })

  if (insertError) {
    console.error("[audits/route] Failed to create AuditRun:", insertError)
    return NextResponse.json({ error: "Failed to create audit run." }, { status: 500 })
  }

  // ── Run the pipeline ──────────────────────────────────────────────
  try {
    await execute(projectId, auditRunId, auditUrl)

    // If a pageId was provided, update the PageUrl row
    if (pageId) {
      const admin = createAdminClient()
      await admin
        .from("PageUrl")
        .update({ lastAuditedAt: new Date().toISOString(), lastAuditRunId: auditRunId })
        .eq("id", pageId)
    }

    return NextResponse.json({ auditRunId, status: "COMPLETED" }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed."
    console.error("[audits/route] Pipeline error:", message)
    return NextResponse.json({ auditRunId, status: "FAILED", error: message }, { status: 500 })
  }
}
