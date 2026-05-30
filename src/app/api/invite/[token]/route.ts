// POST /api/invite/[token] — accept or decline an invite

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = (body as { action?: string }).action

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("ProjectInvite")
    .select("id, projectId, role, status, expiresAt")
    .eq("token", token)
    .single()

  if (!invite) return NextResponse.json({ error: "Invalid token" }, { status: 404 })
  if (invite.status !== "PENDING") return NextResponse.json({ error: "Invite already used" }, { status: 409 })
  if (new Date(invite.expiresAt) < new Date()) {
    await admin.from("ProjectInvite").update({ status: "EXPIRED" }).eq("id", invite.id)
    return NextResponse.json({ error: "Invite expired" }, { status: 410 })
  }

  if (action === "accept") {
    // Add to ProjectMember
    await admin.from("ProjectMember").insert({
      id: crypto.randomUUID(),
      projectId: invite.projectId,
      userId: user.id,
      role: invite.role,
      invitedBy: user.id,
    })
    await admin.from("ProjectInvite").update({ status: "ACCEPTED" }).eq("id", invite.id)
    return NextResponse.json({ accepted: true, projectId: invite.projectId })
  } else {
    await admin.from("ProjectInvite").update({ status: "DECLINED" }).eq("id", invite.id)
    return NextResponse.json({ declined: true })
  }
}
