"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Trash2, Send, Plus, Loader2, CheckCircle2, XCircle,
  Hash, MessageSquare, Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"

type ChannelType = "SLACK" | "DISCORD" | "EMAIL"

interface Channel {
  id: string
  type: ChannelType
  name: string
  url: string
  enabled: boolean
  lastTestedAt: string | null
}

const EVENT_LABELS: Record<string, string> = {
  AUDIT_COMPLETE:      "Audit complete",
  AUDIT_FAILED:        "Audit failed",
  SCORE_DROP:          "Score drop",
  BROKEN_LINKS_FOUND:  "Broken links found",
  SECURITY_GRADE_DROP: "Security grade drop",
}

const TYPE_ICON: Record<ChannelType, React.ElementType> = {
  SLACK:   Hash,
  DISCORD: MessageSquare,
  EMAIL:   Mail,
}

const TYPE_LABEL: Record<ChannelType, string> = {
  SLACK:   "Slack",
  DISCORD: "Discord",
  EMAIL:   "Email Webhook",
}

interface Props {
  projectId: string
  initialChannels: Channel[]
}

export function NotificationChannelsClient({ projectId, initialChannels }: Props) {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: "SLACK" as ChannelType, name: "", url: "" })
  const [formError, setFormError] = useState<string | null>(null)
  const [testStates, setTestStates] = useState<Record<string, "idle" | "sending" | "ok" | "fail">>({})
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  async function addChannel() {
    if (!form.url.trim()) { setFormError("Webhook URL is required"); return }
    setFormError(null)
    const res = await fetch(`/api/projects/${projectId}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) { setFormError((await res.json()).error); return }
    setAdding(false)
    setForm({ type: "SLACK", name: "", url: "" })
    startTransition(() => router.refresh())
    // Optimistically add channel
    const { id } = await res.json().catch(() => ({ id: crypto.randomUUID() }))
    setChannels(prev => [...prev, { ...form, id, enabled: true, lastTestedAt: null }])
  }

  async function toggleEnabled(channel: Channel) {
    const next = !channel.enabled
    setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, enabled: next } : c))
    await fetch(`/api/projects/${projectId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: channel.id, enabled: next }),
    })
  }

  async function deleteChannel(id: string) {
    setDeleteIds(prev => new Set(prev).add(id))
    const res = await fetch(`/api/projects/${projectId}/notifications?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      setChannels(prev => prev.filter(c => c.id !== id))
    }
    setDeleteIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function testChannel(id: string) {
    setTestStates(prev => ({ ...prev, [id]: "sending" }))
    const res = await fetch(`/api/projects/${projectId}/notifications/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: id }),
    })
    const { ok } = await res.json()
    setTestStates(prev => ({ ...prev, [id]: ok ? "ok" : "fail" }))
    // Update lastTestedAt locally
    if (ok) {
      setChannels(prev => prev.map(c => c.id === id ? { ...c, lastTestedAt: new Date().toISOString() } : c))
    }
    setTimeout(() => setTestStates(prev => ({ ...prev, [id]: "idle" })), 3000)
  }

  return (
    <div className="space-y-4">
      {channels.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <MessageSquare className="mx-auto size-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No notification channels yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a Slack or Discord webhook to receive audit alerts.</p>
        </div>
      )}

      {channels.map((ch) => {
        const Icon = TYPE_ICON[ch.type]
        const testState = testStates[ch.id] ?? "idle"
        return (
          <div key={ch.id} className="flex items-center gap-4 rounded-lg border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ch.name || TYPE_LABEL[ch.type]}</span>
                <Badge variant="outline" className="text-xs">{TYPE_LABEL[ch.type]}</Badge>
                {!ch.enabled && <Badge variant="outline" className="text-xs text-muted-foreground">Disabled</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">{ch.url}</p>
              {ch.lastTestedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last tested: {new Date(ch.lastTestedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle */}
              <Button variant="ghost" size="sm" onClick={() => toggleEnabled(ch)} className="text-xs">
                {ch.enabled ? "Disable" : "Enable"}
              </Button>
              {/* Test */}
              <Button
                variant="outline"
                size="sm"
                disabled={testState === "sending"}
                onClick={() => testChannel(ch.id)}
                className="gap-1.5"
              >
                {testState === "sending" && <Loader2 className="size-3 animate-spin" />}
                {testState === "ok"      && <CheckCircle2 className="size-3 text-emerald-500" />}
                {testState === "fail"    && <XCircle className="size-3 text-red-500" />}
                {testState === "idle"    && <Send className="size-3" />}
                {testState === "sending" ? "Sending…" : testState === "ok" ? "Sent!" : testState === "fail" ? "Failed" : "Test"}
              </Button>
              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={deleteIds.has(ch.id)}
                onClick={() => deleteChannel(ch.id)}
              >
                {deleteIds.has(ch.id)
                  ? <Loader2 className="size-4 animate-spin" />
                  : <Trash2 className="size-4" />}
              </Button>
            </div>
          </div>
        )
      })}

      {/* Add channel form */}
      {adding ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Notification Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Type selector */}
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["SLACK", "DISCORD"] as ChannelType[]).map((t) => {
                    const Icon = TYPE_ICON[t]
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                          form.type === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {TYPE_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="ch-name">Display name</Label>
                <Input
                  id="ch-name"
                  placeholder="e.g. #dev-alerts"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="ch-url">Webhook URL</Label>
                <Input
                  id="ch-url"
                  placeholder={form.type === "SLACK"
                    ? "https://hooks.slack.com/services/…"
                    : "https://discord.com/api/webhooks/…"}
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
                {formError && <p className="text-xs text-destructive mt-1">{formError}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setFormError(null) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={addChannel} disabled={isPending}>
                {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Add Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-2">
          <Plus className="size-4" />
          Add Channel
        </Button>
      )}

      {/* Event legend */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notification Events</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <Badge key={key} variant="outline" className="text-xs font-normal">{label}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">All enabled channels receive all events. Per-event filtering coming soon.</p>
      </div>
    </div>
  )
}
