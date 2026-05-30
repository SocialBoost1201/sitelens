"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, Copy, Trash2, Loader2, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ShareLink {
  id: string
  slug: string
  url: string
  createdAt: string
  expiresAt: string | null
  enabled: boolean
}

interface Props {
  projectId: string
  initialShares: ShareLink[]
}

export function ShareLinksClient({ projectId, initialShares }: Props) {
  const router = useRouter()
  const [shares, setShares] = useState<ShareLink[]>(initialShares)
  const [creating, setCreating] = useState(false)
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  async function createShare() {
    setCreating(true)
    const res = await fetch(`/api/projects/${projectId}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setCreating(false)
    if (!res.ok) return
    const { id, slug, url } = await res.json()
    const newShare: ShareLink = {
      id, slug, url,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      enabled: true,
    }
    setShares(prev => [newShare, ...prev])
    router.refresh()
  }

  async function deleteShare(id: string) {
    setDeleteIds(prev => new Set(prev).add(id))
    await fetch(`/api/projects/${projectId}/share?id=${id}`, { method: "DELETE" })
    setShares(prev => prev.filter(s => s.id !== id))
    setDeleteIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {shares.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Link2 className="mx-auto size-7 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-medium">No share links yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Create a link to share this audit report publicly.</p>
        </div>
      )}

      {shares.map((s) => {
        const expired = s.expiresAt && new Date(s.expiresAt) < new Date()
        return (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground truncate">{s.url}</span>
                {expired && <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Expired</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {new Date(s.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                {s.expiresAt && ` · Expires ${new Date(s.expiresAt).toLocaleDateString("en", { month: "short", day: "numeric" })}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="icon" className="size-8" onClick={() => copyUrl(s.url, s.id)}>
                {copied === s.id ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
              <Button
                variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                disabled={deleteIds.has(s.id)}
                onClick={() => deleteShare(s.id)}
              >
                {deleteIds.has(s.id) ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          </div>
        )
      })}

      <Button variant="outline" size="sm" disabled={creating} onClick={createShare} className="gap-2">
        {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {creating ? "Creating…" : "Create Share Link"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Share links are public — anyone with the URL can view the report. Revoke links anytime.
      </p>
    </div>
  )
}
