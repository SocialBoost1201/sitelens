"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RunAuditButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "running" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRun() {
    setState("running")
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/audits/${projectId}`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? "Audit failed. Please try again.")
        setState("error")
        return
      }

      router.refresh()
      setState("idle")
    } catch {
      setErrorMsg("Network error. Please check your connection.")
      setState("error")
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        onClick={handleRun}
        disabled={state === "running"}
        size="sm"
      >
        {state === "running" ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Play className="mr-1.5 size-4" />
        )}
        {state === "running" ? "Running…" : "Run Audit"}
      </Button>
      {state === "running" && (
        <p className="text-xs text-muted-foreground">
          Fetching PageSpeed data — takes 10–30s.
        </p>
      )}
      {state === "error" && errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  )
}
