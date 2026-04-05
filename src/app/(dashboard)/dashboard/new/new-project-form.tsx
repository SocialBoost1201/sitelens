"use client";

// New project form Client Component.
// Wires the createProject Server Action via useActionState for inline validation.

import { useActionState } from "react";
import {
  createProject,
  type ProjectActionState,
} from "@/app/actions/projects";

export default function NewProjectForm() {
  const [state, action, pending] = useActionState<
    ProjectActionState,
    FormData
  >(createProject, undefined);

  const fieldErrors =
    state && "fieldErrors" in state ? state.fieldErrors : {};
  const formError = state && "error" in state ? state.error : null;

  return (
    <form action={action} className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
        >
          {formError}
        </div>
      )}

      {/* Project name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Project name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          required
          maxLength={100}
          placeholder="My Website"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.name}
          </p>
        )}
      </div>

      {/* URL */}
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Website URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          autoComplete="off"
          required
          placeholder="https://example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-describedby={fieldErrors.url ? "url-error" : undefined}
        />
        {fieldErrors.url && (
          <p id="url-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.url}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          One URL per project at MVP. Must start with https:// or http://
        </p>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
        <a
          href="/dashboard"
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
