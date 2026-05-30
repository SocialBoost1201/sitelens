"use client"

import { Trash2 } from "lucide-react"
import { deleteProject } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"

export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${projectName}"?\n\nThis will permanently remove all audit runs, metrics, and findings.`,
    )
    if (!confirmed) return
    await deleteProject(projectId)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
    >
      <Trash2 className="size-4" />
      Delete
    </Button>
  )
}
