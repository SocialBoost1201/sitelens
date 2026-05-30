"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScanSearch, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CrawlButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "crawling" | "error">("idle")
  const [result, setResult] = useState<{ count: number; source: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCrawl() {
    setState("crawling")
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/crawl`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Crawl failed")
        setState("error")
        return
      }

      setResult({ count: data.count, source: data.source })
      setState("idle")
      router.refresh()
    } catch {
      setError("Network error")
      setState("error")
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleCrawl} disabled={state === "crawling"} variant="outline">
        {state === "crawling" ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <ScanSearch className="mr-1.5 size-4" />
        )}
        {state === "crawling" ? "Scanning…" : "Scan Pages"}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          Found {result.count} URLs via {result.source}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
