"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { createProject, type ProjectActionState } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function NewProjectForm() {
  const [state, action, pending] = useActionState<ProjectActionState, FormData>(
    createProject,
    undefined,
  )

  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : {}
  const formError = state && "error" in state ? state.error : null

  return (
    <form action={action} className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </div>
      )}

      {/* Project name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          required
          maxLength={100}
          placeholder="My Website"
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          autoComplete="off"
          required
          placeholder="https://example.com"
          aria-describedby={fieldErrors.url ? "url-error" : undefined}
        />
        {fieldErrors.url ? (
          <p id="url-error" className="text-xs text-destructive">{fieldErrors.url}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Must start with https:// or http://</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {pending ? "Creating…" : "Create project"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
