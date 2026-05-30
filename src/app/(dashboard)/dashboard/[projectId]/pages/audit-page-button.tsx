"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuditPageButtonProps {
  projectId: string
  pageUrl: string
  pageId: string
}

export function AuditPageButton({ projectId, pageUrl, pageId }: AuditPageButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle")

  async function handleAudit() {
    setState("running")
    try {
      const res = await fetch(`/api/audits/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, pageId }),
      })
      if (!res.ok) {
        setState("error")
        return
      }
      setState("done")
      setTimeout(() => {
        setState("idle")
        router.refresh()
      }, 2000)
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <Button size="sm" variant="outline" disabled className="text-emerald-600">
        <CheckCircle2 className="mr-1.5 size-3.5" />
        Done
      </Button>
    )
  }
  if (state === "error") {
    return (
      <Button size="sm" variant="outline" disabled className="text-destructive" onClick={() => setState("idle")}>
        <AlertTriangle className="mr-1.5 size-3.5" />
        Retry
      </Button>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={handleAudit} disabled={state === "running"}>
      {state === "running" ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
      ) : (
        <Play className="mr-1.5 size-3.5" />
      )}
      {state === "running" ? "Auditing…" : "Audit"}
    </Button>
  )
}
