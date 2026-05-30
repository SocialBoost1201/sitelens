"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Loader2, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Comment {
  id: string
  content: string
  authorId: string
  authorEmail: string | null
  findingKey: string | null
  createdAt: string
}

interface Props {
  projectId: string
  auditRunId?: string
  findingKey?: string
  currentUserId?: string
}

export function CommentThread({
  projectId,
  auditRunId,
  findingKey,
  currentUserId,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const params = new URLSearchParams()
    if (auditRunId) params.set("auditRunId", auditRunId)
    if (findingKey) params.set("findingKey", findingKey)

    fetch(`/api/projects/${projectId}/comments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setComments((d as { comments: Comment[] }).comments ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId, auditRunId, findingKey])

  async function submit() {
    if (!text.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, auditRunId, findingKey }),
    })
    setSubmitting(false)
    if (res.ok) {
      const data = (await res.json()) as {
        id: string
        content: string
        authorId: string
        createdAt: string
      }
      setComments((prev) => [
        ...prev,
        { ...data, authorEmail: null, findingKey: findingKey ?? null },
      ])
      setText("")
    }
  }

  async function deleteComment(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id))
    await fetch(`/api/projects/${projectId}/comments?id=${id}`, {
      method: "DELETE",
    })
    setComments((prev) => prev.filter((c) => c.id !== id))
    setDeletingIds((prev) => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="size-4 animate-spin" /> Loading comments…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          No comments yet.
        </div>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2 group">
          <div className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-xs text-muted-foreground">
                {c.authorEmail ?? c.authorId.slice(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{c.content}</p>
          </div>
          {(currentUserId === c.authorId || !currentUserId) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              disabled={deletingIds.has(c.id)}
              onClick={() => deleteComment(c.id)}
            >
              {deletingIds.has(c.id) ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
            </Button>
          )}
        </div>
      ))}

      {currentUserId && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                submit()
              }
            }}
          />
          <Button
            size="icon"
            disabled={submitting || !text.trim()}
            onClick={submit}
            className="h-auto aspect-square self-end"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
