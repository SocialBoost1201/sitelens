// GET  /api/projects/[projectId]/comments?auditRunId=xxx&findingKey=yyy
// POST /api/projects/[projectId]/comments
// DELETE /api/projects/[projectId]/comments?id=xxx

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const auditRunId = searchParams.get("auditRunId")
  const findingKey = searchParams.get("findingKey")

  let query = supabase
    .from("Comment")
    .select("id, content, authorId, findingKey, createdAt, updatedAt")
    .eq("projectId", projectId)
    .order("createdAt")

  if (auditRunId) query = query.eq("auditRunId", auditRunId)
  if (findingKey) query = query.eq("findingKey", findingKey)

  const { data: comments, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with author emails via the admin client
  const admin = createAdminClient()
  const enriched = await Promise.all(
    (comments ?? []).map(async (c) => {
      const { data: ud } = await admin.auth.admin.getUserById(c.authorId)
      return { ...c, authorEmail: ud?.user?.email ?? null }
    }),
  )

  return NextResponse.json({ comments: enriched })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify project access: owner path first, then member path
  const { data: project } = await supabase
    .from("Project")
    .select("id, userId")
    .eq("id", projectId)
    .single()

  if (!project) {
    const { data: member } = await supabase
      .from("ProjectMember")
      .select("id")
      .eq("projectId", projectId)
      .eq("userId", user.id)
      .single()
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { content, auditRunId, findingKey } = body as {
    content?: string
    auditRunId?: string
    findingKey?: string
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error } = await admin.from("Comment").insert({
    id,
    projectId,
    authorId: user.id,
    content: content.trim(),
    auditRunId: auditRunId ?? null,
    findingKey: findingKey ?? null,
    createdAt: now,
    updatedAt: now,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id,
    content: content.trim(),
    authorId: user.id,
    createdAt: now,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Only the comment author or project owner may delete
  const { data: comment } = await supabase
    .from("Comment")
    .select("authorId")
    .eq("id", id)
    .eq("projectId", projectId)
    .single()

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: project } = await supabase
    .from("Project")
    .select("userId")
    .eq("id", projectId)
    .single()

  if (comment.authorId !== user.id && project?.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("Comment").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
