// POST /api/projects/[projectId]/keywords  — register a tracked keyword
// GET  /api/projects/[projectId]/keywords  — list tracked keywords (RLS-scoped)
//
// New keyword-rank-tracking axis (Doc-11 / BL-01). Mirrors the existing axis API
// shape: session auth + project ownership via RLS, writes through the admin client.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { apiRateLimit } from "@/lib/ratelimit"
import { keywordLimit } from "@/lib/rank/plan-limits"

type Device = "DESKTOP" | "MOBILE"

function normalizeDevice(input: unknown): Device {
  return String(input).toUpperCase() === "MOBILE" ? "MOBILE" : "DESKTOP"
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { success } = await apiRateLimit.limit(`${user.id}:${projectId}:keywords`)
  if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })

  // Ownership check via RLS-scoped read.
  const { data: project, error: projErr } = await supabase
    .from("Project").select("id, url").eq("id", projectId).single()
  if (projErr || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : ""
  if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 })

  const targetUrl = typeof body.targetUrl === "string" && body.targetUrl.trim()
    ? body.targetUrl.trim()
    : project.url
  if (!isValidUrl(targetUrl)) {
    return NextResponse.json({ error: "targetUrl must be a valid http(s) URL" }, { status: 400 })
  }

  const country = (typeof body.country === "string" && body.country.trim() ? body.country.trim() : "us").toLowerCase()
  const language = (typeof body.language === "string" && body.language.trim() ? body.language.trim() : "en").toLowerCase()
  const device = normalizeDevice(body.device)

  // Enforce per-plan keyword cap (config-driven, not hardcoded).
  const { count } = await supabase
    .from("TrackedKeyword")
    .select("id", { count: "exact", head: true })
    .eq("projectId", projectId)
  const limit = keywordLimit()
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Keyword limit reached (${limit} for current plan)` },
      { status: 422 },
    )
  }

  const admin = createAdminClient()
  const id = crypto.randomUUID()
  const { error: insErr } = await admin.from("TrackedKeyword").insert({
    id,
    projectId,
    keyword,
    targetUrl,
    country,
    language,
    device,
  })

  if (insErr) {
    // Unique violation → duplicate keyword for this (project, country, language, device).
    const status = insErr.code === "23505" ? 409 : 500
    const message = status === 409 ? "Keyword already tracked for this locale/device" : insErr.message
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ id, keyword, targetUrl, country, language, device }, { status: 201 })
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
    .from("TrackedKeyword")
    .select("id, keyword, targetUrl, country, language, device, enabled, lastCheckedAt, lastPosition, createdAt")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keywords: data ?? [] })
}
