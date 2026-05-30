"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2, XCircle, AlertTriangle, Activity,
  Plus, Trash2, Loader2, ChevronDown, ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type UptimeStatus = "UP" | "DOWN" | "DEGRADED"

interface UptimeEvent {
  id: string
  checkedAt: string
  status: UptimeStatus
  latencyMs: number | null
  statusCode: number | null
  error: string | null
}

interface Monitor {
  id: string
  url: string
  enabled: boolean
  intervalMin: number
  lastCheckedAt: string | null
  lastStatus: UptimeStatus | null
  lastLatencyMs: number | null
  events: UptimeEvent[]
}

interface Props {
  projectId: string
  initialMonitors: Monitor[]
}

function StatusPill({ status }: { status: UptimeStatus | null }) {
  if (!status) return <Badge variant="outline" className="text-xs text-muted-foreground">Unknown</Badge>
  const map: Record<UptimeStatus, string> = {
    UP:       "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    DEGRADED: "bg-amber-500/10 text-amber-700 border-amber-200",
    DOWN:     "bg-red-500/10 text-red-700 border-red-200",
  }
  const icons: Record<UptimeStatus, React.ReactNode> = {
    UP:       <CheckCircle2 className="size-3" />,
    DEGRADED: <AlertTriangle className="size-3" />,
    DOWN:     <XCircle className="size-3" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {icons[status]}
      {status}
    </span>
  )
}

// 24-bar sparkline showing UP/DEGRADED/DOWN history
function UptimeSparkline({ events }: { events: UptimeEvent[] }) {
  if (events.length === 0) return <span className="text-xs text-muted-foreground">No data</span>

  const recent = [...events].reverse().slice(-24)
  const colorMap: Record<UptimeStatus, string> = {
    UP:       "bg-emerald-500",
    DEGRADED: "bg-amber-500",
    DOWN:     "bg-red-500",
  }

  return (
    <div className="flex items-end gap-0.5 h-6">
      {recent.map((ev, i) => (
        <div
          key={i}
          className={`w-2 rounded-sm ${colorMap[ev.status]}`}
          style={{ height: ev.status === "UP" ? "100%" : ev.status === "DEGRADED" ? "70%" : "30%" }}
          title={`${new Date(ev.checkedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} — ${ev.status}${ev.latencyMs ? ` (${ev.latencyMs}ms)` : ""}`}
        />
      ))}
    </div>
  )
}

export function UptimeClient({ projectId, initialMonitors }: Props) {
  const router = useRouter()
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ url: "", intervalMin: 10 })
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function addMonitor() {
    if (!form.url.trim()) { setFormError("URL is required"); return }
    setFormError(null); setCreating(true)
    const res = await fetch(`/api/projects/${projectId}/uptime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setCreating(false)
    if (!res.ok) { setFormError((await res.json()).error); return }
    setAdding(false)
    setForm({ url: "", intervalMin: 10 })
    router.refresh()
  }

  async function toggleEnabled(m: Monitor) {
    const next = !m.enabled
    setMonitors(prev => prev.map(mon => mon.id === m.id ? { ...mon, enabled: next } : mon))
    await fetch(`/api/projects/${projectId}/uptime`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, enabled: next }),
    })
  }

  async function deleteMonitor(id: string) {
    setDeleteIds(prev => new Set(prev).add(id))
    await fetch(`/api/projects/${projectId}/uptime?id=${id}`, { method: "DELETE" })
    setMonitors(prev => prev.filter(m => m.id !== id))
    setDeleteIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
      }
      return s
    })
  }

  // Summary counts
  const up = monitors.filter(m => m.lastStatus === "UP").length
  const down = monitors.filter(m => m.lastStatus === "DOWN").length
  const degraded = monitors.filter(m => m.lastStatus === "DEGRADED").length

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {monitors.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-medium">{up} UP</span>
          {degraded > 0 && <span className="text-amber-600 font-medium">{degraded} DEGRADED</span>}
          {down > 0    && <span className="text-red-600 font-medium">{down} DOWN</span>}
          <span className="text-muted-foreground ml-auto">{monitors.length} monitor{monitors.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {monitors.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Activity className="mx-auto size-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No monitors yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a URL to start monitoring uptime and response time.</p>
        </div>
      )}

      {monitors.map((m) => {
        const isExpanded = expanded.has(m.id)
        const upCount = m.events.filter(e => e.status === "UP").length
        const uptime = m.events.length > 0 ? Math.round((upCount / m.events.length) * 100) : null

        return (
          <div key={m.id} className="rounded-lg border overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Status */}
              <StatusPill status={m.lastStatus} />

              {/* URL + sparkline */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono truncate">{m.url}</span>
                  {!m.enabled && <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Paused</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <UptimeSparkline events={m.events} />
                  {uptime !== null && (
                    <span className="text-xs text-muted-foreground">{uptime}% up</span>
                  )}
                  {m.lastLatencyMs !== null && (
                    <span className="text-xs text-muted-foreground">{m.lastLatencyMs}ms</span>
                  )}
                  {m.lastCheckedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.lastCheckedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleEnabled(m)}>
                  {m.enabled ? "Pause" : "Resume"}
                </Button>
                <Button
                  variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                  disabled={deleteIds.has(m.id)}
                  onClick={() => deleteMonitor(m.id)}
                >
                  {deleteIds.has(m.id) ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleExpand(m.id)}>
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Expanded event log */}
            {isExpanded && m.events.length > 0 && (
              <div className="border-t bg-muted/30 max-h-64 overflow-y-auto">
                {m.events.slice(0, 20).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-2 text-xs border-b last:border-0">
                    <span className="text-muted-foreground w-32 shrink-0">
                      {new Date(ev.checkedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <StatusPill status={ev.status} />
                    {ev.latencyMs !== null && <span className="text-muted-foreground">{ev.latencyMs}ms</span>}
                    {ev.statusCode !== null && <span className="font-mono text-muted-foreground">HTTP {ev.statusCode}</span>}
                    {ev.error && <span className="text-red-600 truncate">{ev.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add monitor form */}
      {adding ? (
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium">Add Monitor</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="mon-url">URL to monitor</Label>
              <Input
                id="mon-url"
                placeholder="https://example.com"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
              {formError && <p className="text-xs text-destructive">{formError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mon-interval">Check interval (minutes)</Label>
              <Input
                id="mon-interval"
                type="number"
                min={5}
                max={60}
                value={form.intervalMin}
                onChange={e => setForm(f => ({ ...f, intervalMin: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAdding(false); setFormError(null) }}>Cancel</Button>
            <Button size="sm" disabled={creating} onClick={addMonitor}>
              {creating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {creating ? "Checking…" : "Add Monitor"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-2">
          <Plus className="size-4" />
          Add Monitor
        </Button>
      )}
    </div>
  )
}
