"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export function AcceptInviteForm({ token, projectId }: { token: string; projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null)
  const [done, setDone] = useState<"accepted" | "declined" | null>(null)

  async function respond(action: "accept" | "decline") {
    setLoading(action)
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    if (res.ok) {
      setDone(action === "accept" ? "accepted" : "declined")
      if (action === "accept") {
        setTimeout(() => router.push(`/dashboard/${projectId}`), 1500)
      }
    }
  }

  if (done === "accepted") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-emerald-600">
        <CheckCircle2 className="size-8" />
        <p className="font-medium">Invitation accepted! Redirecting&hellip;</p>
      </div>
    )
  }
  if (done === "declined") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
        <XCircle className="size-8" />
        <p className="font-medium">Invitation declined.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Button className="flex-1" disabled={loading !== null} onClick={() => respond("accept")}>
        {loading === "accept" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Accept
      </Button>
      <Button variant="outline" className="flex-1" disabled={loading !== null} onClick={() => respond("decline")}>
        {loading === "decline" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Decline
      </Button>
    </div>
  )
}
