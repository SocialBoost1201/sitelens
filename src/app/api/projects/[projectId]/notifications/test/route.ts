// POST /api/projects/[projectId]/notifications/test
// Sends a test message to a specific channel and updates lastTestedAt.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotification } from "@/lib/services/notifier"
import type { NotificationChannelType } from "@/lib/services/notifier"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: project } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { channelId } = body
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 })

  const { data: channel } = await supabase
    .from("NotificationChannel")
    .select("id, type, name, url")
    .eq("id", channelId)
    .eq("projectId", projectId)
    .single()

  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"

  const result = await sendNotification(
    { type: channel.type as NotificationChannelType, url: channel.url, name: channel.name },
    {
      event: "AUDIT_COMPLETE",
      projectName: project.name,
      projectUrl: project.url,
      dashboardUrl: `${appUrl}/dashboard/${projectId}`,
      score: 92,
    },
  )

  if (result.ok) {
    // Update lastTestedAt
    const admin = createAdminClient()
    await admin
      .from("NotificationChannel")
      .update({ lastTestedAt: new Date().toISOString() })
      .eq("id", channelId)
  }

  return NextResponse.json(result)
}
