// GET /api/projects/[projectId]/members — list members + pending invites
// POST /api/projects/[projectId]/members — invite by email
// DELETE /api/projects/[projectId]/members?memberId=xxx — remove member
// DELETE /api/projects/[projectId]/members?inviteId=xxx — revoke invite

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/services/email"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify owner
  const { data: project } = await supabase.from("Project").select("id, userId").eq("id", projectId).single()
  if (!project || project.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Members
  const { data: members } = await admin
    .from("ProjectMember")
    .select("id, userId, role, createdAt, invitedBy")
    .eq("projectId", projectId)
    .order("createdAt")

  // Pending invites
  const { data: invites } = await admin
    .from("ProjectInvite")
    .select("id, email, role, status, createdAt, expiresAt")
    .eq("projectId", projectId)
    .eq("status", "PENDING")
    .order("createdAt", { ascending: false })

  // Resolve user emails for members
  const enriched = await Promise.all((members ?? []).map(async (m) => {
    const { data: userData } = await admin.auth.admin.getUserById(m.userId)
    return { ...m, email: userData?.user?.email ?? null }
  }))

  return NextResponse.json({ members: enriched, invites: invites ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify owner
  const { data: project } = await supabase.from("Project").select("id, userId, name").eq("id", projectId).single()
  if (!project || project.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { email, role = "VIEWER" } = body as { email?: string; role?: string }
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 })

  const admin = createAdminClient()

  // Check not already a member
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const targetUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (targetUser) {
    const { data: existing } = await admin
      .from("ProjectMember")
      .select("id")
      .eq("projectId", projectId)
      .eq("userId", targetUser.id)
      .single()
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 })
  }

  // Check for existing pending invite
  const { data: existingInvite } = await admin
    .from("ProjectInvite")
    .select("id")
    .eq("projectId", projectId)
    .eq("email", email.toLowerCase())
    .eq("status", "PENDING")
    .single()
  if (existingInvite) return NextResponse.json({ error: "Invite already sent" }, { status: 409 })

  // Create invite
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const id = crypto.randomUUID()

  await admin.from("ProjectInvite").insert({
    id,
    projectId,
    email: email.toLowerCase(),
    role: role as "ANALYST" | "VIEWER",
    status: "PENDING",
    token,
    invitedBy: user.id,
    expiresAt,
  })

  // Send invite email
  const inviteUrl = `${APP_URL}/invite/${token}`
  const inviterEmail = user.email ?? "a team member"

  await sendEmail({
    to: email,
    subject: `You've been invited to ${project.name} on SiteLens`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;padding:32px;color:#111827;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <h2 style="margin-top:0;color:#0f172a;">You've been invited to collaborate</h2>
  <p style="color:#6b7280;">${inviterEmail} has invited you to join <strong>${project.name}</strong> on SiteLens as a <strong>${role}</strong>.</p>
  <a href="${inviteUrl}" style="display:inline-block;margin-top:16px;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Accept Invitation</a>
  <p style="margin-top:24px;font-size:12px;color:#9ca3af;">This invite expires in 7 days. If you didn't expect this, you can safely ignore this email.</p>
</div>
</body></html>`,
  })

  return NextResponse.json({ id, token, inviteUrl })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: project } = await supabase.from("Project").select("id, userId").eq("id", projectId).single()
  if (!project || project.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const inviteId = searchParams.get("inviteId")
  const admin = createAdminClient()

  if (memberId) {
    await admin.from("ProjectMember").delete().eq("id", memberId).eq("projectId", projectId)
  } else if (inviteId) {
    await admin.from("ProjectInvite").delete().eq("id", inviteId).eq("projectId", projectId)
  } else {
    return NextResponse.json({ error: "memberId or inviteId required" }, { status: 400 })
  }

  return NextResponse.json({ deleted: true })
}
