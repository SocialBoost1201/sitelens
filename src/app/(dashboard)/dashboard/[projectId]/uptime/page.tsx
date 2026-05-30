// Uptime Monitoring page — /dashboard/[projectId]/uptime

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UptimeClient } from "./uptime-client"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Uptime — SiteLens` : "Uptime — SiteLens" }
}

type UptimeStatus = "UP" | "DOWN" | "DEGRADED"

interface UptimeEventRow {
  id: string
  monitorId: string
  checkedAt: string
  status: UptimeStatus
  latencyMs: number | null
  statusCode: number | null
  error: string | null
}

interface MonitorRow {
  id: string
  url: string
  enabled: boolean
  intervalMin: number
  lastCheckedAt: string | null
  lastStatus: UptimeStatus | null
  lastLatencyMs: number | null
  createdAt: string
  events: UptimeEventRow[]
}

export default async function UptimePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  // Fetch monitors + recent events via API shape
  const { data: monitors } = await supabase
    .from("UptimeMonitor")
    .select("id, url, enabled, intervalMin, lastCheckedAt, lastStatus, lastLatencyMs, createdAt")
    .eq("projectId", projectId)
    .order("createdAt")

  const monitorIds = (monitors ?? []).map(m => m.id)
  const eventsMap: Record<string, UptimeEventRow[]> = {}

  if (monitorIds.length > 0) {
    const { data: events } = await supabase
      .from("UptimeEvent")
      .select("id, monitorId, checkedAt, status, latencyMs, statusCode, error")
      .in("monitorId", monitorIds)
      .order("checkedAt", { ascending: false })
      .limit(500)

    for (const ev of events ?? []) {
      if (!eventsMap[ev.monitorId]) eventsMap[ev.monitorId] = []
      if (eventsMap[ev.monitorId].length < 50) eventsMap[ev.monitorId].push(ev as UptimeEventRow)
    }
  }

  const monitorsWithEvents: MonitorRow[] = (monitors ?? []).map(m => ({
    ...m,
    lastStatus: m.lastStatus as UptimeStatus | null,
    events: eventsMap[m.id] ?? [],
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Uptime</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="size-6" />
          Uptime Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor URL availability and response time. Checks run every 5–60 minutes.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monitors</CardTitle>
          <CardDescription>
            Add URLs to monitor. DOWN alerts are sent to your notification channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UptimeClient projectId={projectId} initialMonitors={monitorsWithEvents} />
        </CardContent>
      </Card>
    </div>
  )
}
