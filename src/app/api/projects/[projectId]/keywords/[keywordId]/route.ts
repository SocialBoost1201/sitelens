// PATCH  /api/projects/[projectId]/keywords/[keywordId]  — enable/disable tracking
// DELETE /api/projects/[projectId]/keywords/[keywordId]  — stop tracking
//
// Ownership is enforced by reading the keyword through the RLS-scoped client first
// (returns nothing if the caller does not own the parent project); writes then go
// through the admin client.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function authorizeOwnedKeyword(projectId: string, keywordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const { data: kw } = await supabase
    .from("TrackedKeyword")
    .select("id, projectId")
    .eq("id", keywordId)
    .eq("projectId", projectId)
    .single()

  if (!kw) return { error: NextResponse.json({ error: "Keyword not found" }, { status: 404 }) }
  return { user }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> },
) {
  const { projectId, keywordId } = await params
  const auth = await authorizeOwnedKeyword(projectId, keywordId)
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("TrackedKeyword")
    .update({ enabled: body.enabled })
    .eq("id", keywordId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: keywordId, enabled: body.enabled })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> },
) {
  const { projectId, keywordId } = await params
  const auth = await authorizeOwnedKeyword(projectId, keywordId)
  if ("error" in auth) return auth.error

  const admin = createAdminClient()
  const { error } = await admin.from("TrackedKeyword").delete().eq("id", keywordId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: keywordId, deleted: true })
}
