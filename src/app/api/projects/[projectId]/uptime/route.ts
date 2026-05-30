// Uptime Monitors API — /api/projects/[projectId]/uptime
// GET   — list monitors + recent events
// POST  — create monitor
// PATCH — update monitor (toggle enabled, change interval)
// DELETE — remove monitor

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkUptime } from "@/lib/services/uptime-checker"
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

type Params = { params: Promise<{ projectId: string }> }

async function requireOwner(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const { data: project } = await supabase
    .from("Project").select("id").eq("id", projectId).single()
  if (!project) return { supabase, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }

  return { supabase, error: null }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { supabase, error } = await requireOwner(projectId)
  if (error) return error

  const { data: monitors } = await supabase
    .from("UptimeMonitor")
    .select("id, url, enabled, intervalMin, lastCheckedAt, lastStatus, lastLatencyMs, createdAt")
    .eq("projectId", projectId)
    .order("createdAt")

  // Fetch last 50 events per monitor (latest first)
  const monitorIds = (monitors ?? []).map(m => m.id)
  const eventsMap: Record<string, unknown[]> = {}

  if (monitorIds.length > 0) {
    const { data: events } = await supabase
      .from("UptimeEvent")
      .select("id, monitorId, checkedAt, status, latencyMs, statusCode, error")
      .in("monitorId", monitorIds)
      .order("checkedAt", { ascending: false })
      .limit(200)

    for (const ev of events ?? []) {
      if (!eventsMap[ev.monitorId]) eventsMap[ev.monitorId] = []
      if (eventsMap[ev.monitorId].length < 50) eventsMap[ev.monitorId].push(ev)
    }
  }

  return NextResponse.json({
    monitors: (monitors ?? []).map(m => ({
      ...m,
      events: eventsMap[m.id] ?? [],
    })),
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { url, intervalMin } = body
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

  let safeUrl: string
  try {
    safeUrl = await assertSafeExternalHttpUrl(String(url))
  } catch (error) {
    if (isUnsafeExternalUrlError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  const admin = createAdminClient()
  const id = crypto.randomUUID()

  // Run initial check immediately
  const initial = await checkUptime(safeUrl)

  await admin.from("UptimeMonitor").insert({
    id,
    projectId,
    url: safeUrl,
    intervalMin: intervalMin ?? 10,
    enabled: true,
    lastCheckedAt: initial.checkedAt,
    lastStatus: initial.status,
    lastLatencyMs: initial.latencyMs,
  })

  await admin.from("UptimeEvent").insert({
    id: crypto.randomUUID(),
    monitorId: id,
    checkedAt: initial.checkedAt,
    status: initial.status,
    latencyMs: initial.latencyMs,
    statusCode: initial.statusCode,
    error: initial.error,
  })

  return NextResponse.json({ id, status: initial.status, latencyMs: initial.latencyMs }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const allowed = ["enabled", "intervalMin", "url"]
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  if (typeof patch.url === "string") {
    try {
      patch.url = await assertSafeExternalHttpUrl(patch.url)
    } catch (error) {
      if (isUnsafeExternalUrlError(error)) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }
  }

  const admin = createAdminClient()
  const { error: updErr } = await admin
    .from("UptimeMonitor").update(patch).eq("id", id).eq("projectId", projectId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("UptimeMonitor").delete().eq("id", id).eq("projectId", projectId)
  return NextResponse.json({ ok: true })
}
