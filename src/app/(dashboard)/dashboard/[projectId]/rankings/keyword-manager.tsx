"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, RefreshCw, Trash2, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RankTrendChart, type RankTrendPoint } from "./rank-trend-chart"

export interface KeywordView {
  id: string
  keyword: string
  targetUrl: string
  country: string
  language: string
  device: "DESKTOP" | "MOBILE"
  enabled: boolean
  lastCheckedAt: string | null
  current: number | null
  previous: number | null
  history: RankTrendPoint[]
}

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null && previous == null) return <span className="text-xs text-muted-foreground">—</span>
  if (current == null) return <span className="text-xs font-medium text-red-500">dropped out</span>
  if (previous == null) return <span className="text-xs text-muted-foreground">new</span>
  const delta = previous - current // +ve = improved (moved up)
  if (delta === 0) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="size-3" />0</span>
  if (delta > 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500"><TrendingUp className="size-3" />+{delta}</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><TrendingDown className="size-3" />{delta}</span>
}

export function KeywordManager({ projectId, keywords }: { projectId: string; keywords: KeywordView[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [keyword, setKeyword] = useState("")
  const [country, setCountry] = useState("us")
  const [language, setLanguage] = useState("en")
  const [device, setDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP")

  const base = `/api/projects/${projectId}/keywords`

  async function addKeyword() {
    setError(null)
    if (!keyword.trim()) { setError("Enter a keyword"); return }
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, country, language, device }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "Failed to add keyword")
      return
    }
    setKeyword("")
    startTransition(() => router.refresh())
  }

  async function act(id: string, action: () => Promise<Response>) {
    setError(null)
    setBusyId(id)
    try {
      const res = await action()
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Action failed")
        return
      }
      startTransition(() => router.refresh())
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add keyword */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Track a keyword</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="e.g. best running shoes"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addKeyword() }}
              />
            </div>
            <select className={SELECT_CLASS} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
              <option value="us">US</option>
              <option value="jp">JP</option>
              <option value="gb">UK</option>
              <option value="ca">CA</option>
              <option value="au">AU</option>
              <option value="de">DE</option>
              <option value="fr">FR</option>
            </select>
            <select className={SELECT_CLASS} value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
              <option value="en">en</option>
              <option value="ja">ja</option>
              <option value="de">de</option>
              <option value="fr">fr</option>
            </select>
            <select className={SELECT_CLASS} value={device} onChange={(e) => setDevice(e.target.value as "DESKTOP" | "MOBILE")} aria-label="Device">
              <option value="DESKTOP">Desktop</option>
              <option value="MOBILE">Mobile</option>
            </select>
            <Button onClick={addKeyword} disabled={isPending}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {/* Keyword list */}
      <Card>
        <CardContent className="p-0">
          {keywords.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No keywords tracked yet. Add one above to start tracking its Google position.
            </div>
          ) : (
            <div className="divide-y">
              {keywords.map((k) => (
                <div key={k.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === k.id ? null : k.id)}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded === k.id ? "rotate-180" : ""}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{k.keyword}</span>
                          {!k.enabled && <span className="text-[10px] uppercase text-muted-foreground border rounded px-1">paused</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {k.country.toUpperCase()} · {k.language} · {k.device.toLowerCase()}
                          {k.lastCheckedAt ? ` · checked ${new Date(k.lastCheckedAt).toLocaleDateString()}` : " · never checked"}
                        </span>
                      </div>
                    </button>

                    <div className="w-16 text-right">
                      <span className="text-lg font-semibold tabular-nums">{k.current != null ? `#${k.current}` : "—"}</span>
                    </div>
                    <div className="w-24 text-right"><DeltaBadge current={k.current} previous={k.previous} /></div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Fetch now" disabled={busyId === k.id || isPending}
                        onClick={() => act(k.id, () => fetch(`${base}/${k.id}/refresh`, { method: "POST" }))}>
                        <RefreshCw className={`size-4 ${busyId === k.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" title={k.enabled ? "Pause" : "Resume"} disabled={busyId === k.id || isPending}
                        onClick={() => act(k.id, () => fetch(`${base}/${k.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !k.enabled }) }))}>
                        <span className="text-xs">{k.enabled ? "⏸" : "▶"}</span>
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" disabled={busyId === k.id || isPending}
                        onClick={() => act(k.id, () => fetch(`${base}/${k.id}`, { method: "DELETE" }))}>
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {expanded === k.id && (
                    <div className="px-4 pb-4">
                      <RankTrendChart data={k.history} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
