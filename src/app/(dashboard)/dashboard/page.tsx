// Dashboard — project list page
//
// Server Component: fetches the authenticated user's projects directly.
// RLS guarantees that only the user's own projects (and those they are
// a member of) are returned.

import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard — SiteLens",
};

type Project = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("Project")
    .select("id, name, url, createdAt")
    .order("createdAt", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Websites registered for auditing.
          </p>
        </div>
        <a
          href="/dashboard/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New project
        </a>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          Failed to load projects. Please refresh the page.
        </div>
      )}

      {/* Empty state */}
      {!error && (!projects || projects.length === 0) && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No projects yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Get started by adding a website to audit.
          </p>
          <a
            href="/dashboard/new"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Add your first project
          </a>
        </div>
      )}

      {/* Project list */}
      {projects && projects.length > 0 && (
        <ul className="space-y-3">
          {(projects as Project[]).map((project) => (
            <li key={project.id}>
              <a
                href={`/dashboard/${project.id}`}
                className="block rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {project.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {project.url}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                    No runs yet
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
