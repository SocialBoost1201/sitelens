"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RunLinksButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "running" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handle() {
    setState("running"); setError(null)
    const res = await fetch(`/api/projects/${projectId}/links`, { method: "POST" })
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); setState("error"); return }
    setState("idle"); router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handle} disabled={state === "running"}>
        {state === "running" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Link2 className="mr-1.5 size-4" />}
        {state === "running" ? "Checking…" : "Check Broken Links"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
