// Project detail page — SiteLens
//
// Shows a single project's current status, audit run history, and
// threshold rule violations.
//
// At MVP, audit runs cannot yet be triggered from this page (the pipeline
// is not implemented). The "Run audit" button is present but disabled with
// a clear "coming soon" label so the UI is navigable without mocking data.
//
// Server Component: fetches project + audit runs on each request.
// RLS guarantees that only authorised users can see the project.

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteProjectButton from "./delete-project-button";
import RunAuditButton from "./run-audit-button";

type AuditRun = {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
};

type Project = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  RUNNING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("Project")
    .select("name")
    .eq("id", projectId)
    .single();

  return {
    title: data ? `${data.name} — SiteLens` : "Project — SiteLens",
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Verify auth — layout already guards but Server Components must check independently.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Fetch project (RLS ensures only owner/members can read).
  const { data: project, error: projectError } = await supabase
    .from("Project")
    .select("id, name, url, createdAt")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch audit runs, newest first.
  const { data: auditRuns } = await supabase
    .from("AuditRun")
    .select("id, status, createdAt, startedAt, finishedAt, errorMessage")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })
    .limit(20);

  const typedProject = project as Project;
  const typedRuns = (auditRuns ?? []) as AuditRun[];
  const latestRun = typedRuns[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <a
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Projects
        </a>
      </div>

      {/* Project header card */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">
              {typedProject.name}
            </h1>
            <a
              href={typedProject.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block truncate text-sm text-blue-600 hover:underline"
            >
              {typedProject.url}
            </a>
            <p className="mt-2 text-xs text-gray-400">
              Created {formatDate(typedProject.createdAt)}
            </p>
          </div>

          {/* Current status badge */}
          <div className="shrink-0">
            {latestRun ? (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[latestRun.status] ?? "bg-gray-100 text-gray-500"}`}
              >
                {STATUS_LABELS[latestRun.status] ?? latestRun.status}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                No runs
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
          <RunAuditButton projectId={typedProject.id} />
          <div className="ml-auto">
            <DeleteProjectButton projectId={typedProject.id} projectName={typedProject.name} />
          </div>
        </div>
      </div>

      {/* Audit run history */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Audit runs</h2>

        {typedRuns.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-center">
            <p className="text-sm text-gray-400">
              No audit runs yet. Trigger your first audit to get started.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {typedRuns.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[run.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}
                  >
                    {STATUS_LABELS[run.status] ?? run.status}
                  </span>
                  {run.errorMessage && (
                    <p className="mt-1 truncate text-xs text-red-500">
                      {run.errorMessage}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDate(run.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
