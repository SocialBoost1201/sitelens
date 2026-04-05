"use client";

// Delete project button Client Component.
// Shows a confirmation dialog before calling the deleteProject Server Action.

import { deleteProject } from "@/app/actions/projects";

export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${projectName}"? This will permanently remove all audit runs, metrics, and findings.`,
    );
    if (!confirmed) return;
    await deleteProject(projectId);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
    >
      Delete project
    </button>
  );
}
