// Dashboard — project list page
// Server Component: fetches the authenticated user's projects + latest audit run.

import Link from "next/link"
import { Plus, FolderOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "./project-card"

export const metadata = {
  title: "Dashboard — SiteLens",
}

type Project = {
  id: string
  name: string
  url: string
  createdAt: string
}

type AuditRun = {
  id: string
  projectId: string
  status: string
  createdAt: string
}



export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: projects, error }, { data: latestRuns }] = await Promise.all([
    supabase
      .from("Project")
      .select("id, name, url, createdAt")
      .order("createdAt", { ascending: false }),
    supabase
      .from("AuditRun")
      .select("id, projectId, status, createdAt")
      .order("createdAt", { ascending: false }),
  ])

  const latestRunMap = new Map<string, AuditRun>()
  for (const run of (latestRuns ?? []) as AuditRun[]) {
    if (!latestRunMap.has(run.projectId)) latestRunMap.set(run.projectId, run)
  }

  const projectList = (projects ?? []) as Project[]
  const completedCount = Array.from(latestRunMap.values()).filter(r => r.status === "COMPLETED").length

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm" style={{ color: "oklch(0.55 0.010 265)" }}>
            {projectList.length === 0
              ? "Register your first website to start auditing."
              : `${projectList.length} website${projectList.length !== 1 ? "s" : ""} registered for auditing.`}
          </p>
        </div>
        <Button asChild className="shrink-0 font-semibold"
          style={{
            background: "oklch(0.65 0.22 258)",
            boxShadow: "0 0 16px oklch(0.65 0.22 258 / 25%)",
          }}
        >
          <Link href="/dashboard/new">
            <Plus className="mr-1.5 size-4" />
            New project
          </Link>
        </Button>
      </div>

      {/* ── Summary bar ──────────────────────────────────────────── */}
      {projectList.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Sites",      value: projectList.length },
            { label: "Audits Completed", value: completedCount },
            { label: "Alerts",           value: 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3"
              style={{
                background: "oklch(0.13 0.006 265)",
                border: "1px solid oklch(1 0 0 / 7%)",
              }}
            >
              <p className="text-xs" style={{ color: "oklch(0.52 0.012 265)" }}>{label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "oklch(0.628 0.258 29 / 8%)",
            border: "1px solid oklch(0.628 0.258 29 / 25%)",
            color: "oklch(0.80 0.14 29)",
          }}
        >
          Failed to load projects. Please refresh the page.
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!error && projectList.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-24 text-center"
          style={{
            background: "oklch(0.13 0.006 265)",
            border: "1px dashed oklch(1 0 0 / 10%)",
          }}
        >
          {/* Glow orb */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-30"
              style={{ background: "oklch(0.65 0.22 258)" }}
            />
            <div
              className="relative flex size-16 items-center justify-center rounded-2xl"
              style={{
                background: "oklch(0.65 0.22 258 / 15%)",
                border: "1px solid oklch(0.65 0.22 258 / 30%)",
              }}
            >
              <FolderOpen className="size-8" style={{ color: "oklch(0.65 0.22 258)" }} />
            </div>
          </div>
          <h3 className="text-base font-bold tracking-tight">No projects yet</h3>
          <p className="mt-2 max-w-xs text-sm" style={{ color: "oklch(0.52 0.012 265)" }}>
            Add a website to start running PageSpeed, SEO, and security audits automatically.
          </p>
          <Button
            className="mt-6 font-semibold"
            asChild
            style={{
              background: "oklch(0.65 0.22 258)",
              boxShadow: "0 0 16px oklch(0.65 0.22 258 / 25%)",
            }}
          >
            <Link href="/dashboard/new">
              <Plus className="mr-1.5 size-4" />
              Add your first project
            </Link>
          </Button>
        </div>
      )}

      {projectList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projectList.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              latestRun={latestRunMap.get(project.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
