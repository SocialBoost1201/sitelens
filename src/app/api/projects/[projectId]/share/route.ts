// Public Share API — /api/projects/[projectId]/share
// GET  — list shares for project
// POST — create a new share link
// DELETE — revoke a share

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Params = { params: Promise<{ projectId: string }> }

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

async function requireOwner(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const { data: project } = await supabase.from("Project").select("id").eq("id", projectId).single()
  if (!project) return { supabase, error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  return { supabase, error: null }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { supabase, error } = await requireOwner(projectId)
  if (error) return error

  const { data } = await supabase
    .from("PublicShare")
    .select("id, slug, createdAt, expiresAt, enabled")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"
  return NextResponse.json({
    shares: (data ?? []).map(s => ({
      ...s,
      url: `${appUrl}/share/${s.slug}`,
    })),
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { expiresInDays } = body  // optional

  const admin = createAdminClient()
  const id = crypto.randomUUID()
  let slug = generateSlug()

  // Ensure slug uniqueness (retry once if collision)
  const { data: existing } = await admin.from("PublicShare").select("id").eq("slug", slug).single()
  if (existing) slug = generateSlug()

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400_000).toISOString()
    : null

  await admin.from("PublicShare").insert({ id, projectId, slug, expiresAt, enabled: true })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"
  return NextResponse.json({ id, slug, url: `${appUrl}/share/${slug}` }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { projectId } = await params
  const { error } = await requireOwner(projectId)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("PublicShare").delete().eq("id", id).eq("projectId", projectId)
  return NextResponse.json({ ok: true })
}
