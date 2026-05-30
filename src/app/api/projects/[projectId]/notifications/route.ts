// Notification Channels API — /api/projects/[projectId]/notifications
// GET   — list channels for project
// POST  — create a new channel
// PATCH — toggle enabled / update
// DELETE — remove channel

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Params = { params: Promise<{ projectId: string }> }

async function requireOwner(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const { data: project, error } = await supabase
    .from("Project").select("id").eq("id", projectId).single()
  if (error || !project) return { user: null, supabase, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }

  return { user, supabase, error: null }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error, supabase } = await requireOwner(projectId)
  if (error) return error

  const { data, error: dbErr } = await supabase
    .from("NotificationChannel")
    .select("id, type, name, url, events, enabled, createdAt, lastTestedAt")
    .eq("projectId", projectId)
    .order("createdAt")

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ channels: data ?? [] })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { type, name, url, events } = body

  if (!type || !url) return NextResponse.json({ error: "type and url required" }, { status: 400 })
  if (!["SLACK", "DISCORD", "EMAIL"].includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })

  const admin = createAdminClient()
  const id = crypto.randomUUID()

  const { error: insertErr } = await admin.from("NotificationChannel").insert({
    id,
    projectId,
    type,
    name: name ?? "",
    url,
    events: events ?? ["AUDIT_COMPLETE", "AUDIT_FAILED"],
    enabled: true,
  })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ id }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Whitelist updatable fields
  const allowed = ["name", "url", "events", "enabled"]
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const admin = createAdminClient()
  const { error: updErr } = await admin
    .from("NotificationChannel")
    .update(patch)
    .eq("id", id)
    .eq("projectId", projectId)

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
  const { error: delErr } = await admin
    .from("NotificationChannel")
    .delete()
    .eq("id", id)
    .eq("projectId", projectId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
