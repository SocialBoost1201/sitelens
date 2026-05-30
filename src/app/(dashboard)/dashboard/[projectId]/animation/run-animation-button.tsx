"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RunAnimationButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleRun() {
    try {
      setIsRunning(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      const response = await fetch(`/api/projects/${projectId}/animation`, { method: "POST" })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const setupHint =
          payload && typeof payload.setupHint === "string" ? payload.setupHint : null
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Animation analysis failed"
        const fullMessage = setupHint ? `${message} ${setupHint}` : message
        console.error(fullMessage)
        setErrorMessage(fullMessage)
        return
      }

      const payload = await response.json().catch(() => null)
      const comparison = payload && typeof payload === "object" && "comparison" in payload
        ? payload.comparison as { newlyDetectedCount?: number } | null
        : null
      const newlyDetectedCount =
        comparison && typeof comparison.newlyDetectedCount === "number"
          ? comparison.newlyDetectedCount
          : null

      setSuccessMessage(
        newlyDetectedCount === null
          ? "Animation analysis saved."
          : `Animation analysis saved. ${newlyDetectedCount} newly detected entries.`,
      )
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Animation analysis failed"
      console.error(message)
      setErrorMessage(message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleRun} disabled={isRunning}>
        {isRunning ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 size-4" />
        )}
        {isRunning ? "Analyzing..." : "Run Analysis"}
      </Button>
      {errorMessage && (
        <p className="max-w-sm text-right text-xs text-destructive">{errorMessage}</p>
      )}
      {!errorMessage && successMessage && (
        <p className="max-w-sm text-right text-xs text-emerald-600">{successMessage}</p>
      )}
    </div>
  )
}
