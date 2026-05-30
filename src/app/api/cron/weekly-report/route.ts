// GET /api/cron/weekly-report
// Vercel Cron: runs every Monday 09:00 UTC
// cron: "0 9 * * 1"
// Sends weekly digest email to each project owner.
// Protected by CRON_SECRET.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, renderWeeklyReport } from "@/lib/services/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"

  // Compute week range
  const now = new Date()
  const weekEnd = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const weekStartDate = new Date(now)
  weekStartDate.setDate(weekStartDate.getDate() - 7)
  const weekStart = weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  // Fetch all projects
  const { data: projects } = await admin.from("Project").select("id, name, url, userId")
  if (!projects?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  const errors: string[] = []

  for (const project of projects) {
    try {
      // Get user email from auth
      const { data: userData } = await admin.auth.admin.getUserById(project.userId)
      const email = userData?.user?.email
      if (!email) continue

      // Latest audit score
      const { data: latestRun } = await admin
        .from("AuditRun")
        .select("id, rawData")
        .eq("projectId", project.id)
        .eq("status", "COMPLETED")
        .order("createdAt", { ascending: false })
        .limit(1)
        .single()

      const rawData = latestRun?.rawData as Record<string, unknown> | null
      const auditScore = typeof rawData?.score === "number" ? rawData.score : null

      // SEO score
      const { data: seoResult } = await admin
        .from("SeoResult")
        .select("score")
        .eq("projectId", project.id)
        .order("analyzedAt", { ascending: false })
        .limit(1)
        .single()

      // Security grade
      const { data: secResult } = await admin
        .from("SecurityResult")
        .select("grade")
        .eq("projectId", project.id)
        .order("scannedAt", { ascending: false })
        .limit(1)
        .single()

      // Broken links count
      const { count: brokenCount } = await admin
        .from("BrokenLink")
        .select("id", { count: "exact", head: true })
        .eq("projectId", project.id)

      // Uptime (past 7 days) — % of UP events
      const since = weekStartDate.toISOString()
      const { data: uptimeEvents } = await admin
        .from("UptimeEvent")
        .select("status")
        .gte("checkedAt", since)
        .in("monitorId",
          (await admin.from("UptimeMonitor").select("id").eq("projectId", project.id)).data?.map(m => m.id) ?? []
        )

      let uptimePercent: number | null = null
      if (uptimeEvents && uptimeEvents.length > 0) {
        const upCount = uptimeEvents.filter(e => e.status === "UP").length
        uptimePercent = (upCount / uptimeEvents.length) * 100
      }

      const html = renderWeeklyReport({
        projectName: project.name,
        projectUrl: project.url,
        appUrl,
        projectId: project.id,
        auditScore,
        seoScore: seoResult?.score ?? null,
        securityGrade: secResult?.grade ?? null,
        brokenLinksCount: brokenCount ?? 0,
        uptimePercent,
        weekStart,
        weekEnd,
      })

      await sendEmail({
        to: email,
        subject: `📊 Weekly Report — ${project.name}`,
        html,
      })
      sent++
    } catch (err) {
      errors.push(`${project.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
}
