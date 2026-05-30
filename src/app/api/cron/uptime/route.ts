// GET /api/cron/uptime
// Called by Vercel Cron (every 5 min) or external scheduler.
// Checks all enabled UptimeMonitors whose next check is due, persists
// UptimeEvents, updates UptimeMonitor lastStatus, fires DOWN notifications.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkUptime } from "@/lib/services/uptime-checker"
import { fireEvent } from "@/lib/services/notifier"
import type { NotificationChannelType } from "@/lib/services/notifier"
import { assertSafeExternalHttpUrl } from "@/lib/security/url"

export async function GET(req: NextRequest) {
  // Validate cron secret (Vercel sends Authorization header)
  const auth = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch all enabled monitors
  const { data: monitors, error } = await admin
    .from("UptimeMonitor")
    .select("id, projectId, url, intervalMin, lastCheckedAt, lastStatus, enabled")
    .eq("enabled", true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const due = (monitors ?? []).filter((m) => {
    if (!m.lastCheckedAt) return true
    const last = new Date(m.lastCheckedAt).getTime()
    return now - last >= m.intervalMin * 60 * 1000
  })

  const results = await Promise.allSettled(
    due.map(async (monitor) => {
      const monitorUrl = await assertSafeExternalHttpUrl(monitor.url)
      const result = await checkUptime(monitorUrl)

      // Write UptimeEvent
      await admin.from("UptimeEvent").insert({
        id: crypto.randomUUID(),
        monitorId: monitor.id,
        checkedAt: result.checkedAt,
        status: result.status,
        latencyMs: result.latencyMs,
        statusCode: result.statusCode,
        error: result.error,
      })

      // Update UptimeMonitor summary
      await admin.from("UptimeMonitor").update({
        lastCheckedAt: result.checkedAt,
        lastStatus: result.status,
        lastLatencyMs: result.latencyMs,
      }).eq("id", monitor.id)

      // Fire DOWN notification if status just changed to DOWN
      if (result.status === "DOWN" && monitor.lastStatus !== "DOWN") {
        const { data: project } = await admin
          .from("Project").select("name").eq("id", monitor.projectId).single()

        const { data: channels } = await admin
          .from("NotificationChannel")
          .select("type, name, url")
          .eq("projectId", monitor.projectId)
          .eq("enabled", true)

        if (channels && channels.length > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"
          await fireEvent(
            channels.map(c => ({ ...c, type: c.type as NotificationChannelType })),
            {
              event: "AUDIT_FAILED",
              projectName: project?.name ?? monitor.projectId,
              projectUrl: monitorUrl,
              dashboardUrl: `${appUrl}/dashboard/${monitor.projectId}`,
              errorMessage: result.error ?? `Site is DOWN (HTTP ${result.statusCode ?? "timeout"})`,
            },
          )
        }
      }

      return { monitorId: monitor.id, status: result.status }
    }),
  )

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: (r.reason as Error).message },
  )

  return NextResponse.json({ checked: due.length, summary })
}
