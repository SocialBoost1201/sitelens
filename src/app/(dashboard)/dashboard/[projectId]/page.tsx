// Project detail page — SiteLens
// 3-column layout: left (scores), center (site preview), right (site info)
// Server Component: fetches project + audit runs. RLS enforces access control.

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Globe,
  ExternalLink,
  ChevronLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TimerOff,
  Calendar,
  Timer,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  Gauge,
  Eye,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import DeleteProjectButton from "./delete-project-button"
import RunAuditButton from "./run-audit-button"
import { ScoreTrendChart, type ScoreTrendPoint } from "@/components/charts/score-trend-chart"
import { CommentThread } from "@/components/comments/comment-thread"
import { SitePreviewImage } from "./site-preview-image"
import { ScoreRing } from "./score-ring"

type AuditRun = {
  id: string
  status: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
}

type Project = {
  id: string
  name: string
  url: string
  createdAt: string
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—"
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ReactNode; label: string; dot: string; bg: string; color: string }> = {
    COMPLETED: {
      icon: <CheckCircle2 className="size-3" />,
      label: "Completed",
      dot: "oklch(0.627 0.194 145)",
      bg: "oklch(0.627 0.194 145 / 10%)",
      color: "oklch(0.627 0.194 145)",
    },
    RUNNING: {
      icon: <Loader2 className="size-3 animate-spin" />,
      label: "Running",
      dot: "oklch(0.65 0.22 258)",
      bg: "oklch(0.65 0.22 258 / 10%)",
      color: "oklch(0.65 0.22 258)",
    },
    PENDING: {
      icon: <Clock className="size-3" />,
      label: "Pending",
      dot: "oklch(0.769 0.188 70)",
      bg: "oklch(0.769 0.188 70 / 10%)",
      color: "oklch(0.769 0.188 70)",
    },
    FAILED: {
      icon: <AlertTriangle className="size-3" />,
      label: "Failed",
      dot: "oklch(0.628 0.258 29)",
      bg: "oklch(0.628 0.258 29 / 10%)",
      color: "oklch(0.628 0.258 29)",
    },
  }
  const c = configs[status] ?? {
    icon: <TimerOff className="size-3" />,
    label: status,
    dot: "oklch(0.52 0.012 265)",
    bg: "oklch(1 0 0 / 5%)",
    color: "oklch(0.52 0.012 265)",
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}



export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("Project")
    .select("name")
    .eq("id", projectId)
    .single()

  return {
    title: data ? `${data.name} — SiteLens` : "Project — SiteLens",
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const [{ data: project, error: projectError }, { data: auditRuns }] =
    await Promise.all([
      supabase
        .from("Project")
        .select("id, name, url, createdAt")
        .eq("id", projectId)
        .single(),
      supabase
        .from("AuditRun")
        .select("id, status, createdAt, startedAt, finishedAt, errorMessage")
        .eq("projectId", projectId)
        .order("createdAt", { ascending: false })
        .limit(20),
    ])

  if (projectError || !project) notFound()

  const typedProject = project as Project
  const typedRuns = (auditRuns ?? []) as AuditRun[]
  const latestRun = typedRuns[0] ?? null
  const latestCompleted = typedRuns.find((r) => r.status === "COMPLETED") ?? null

  // Fetch metrics for trend + latest scores
  const completedRunIds = typedRuns
    .filter((r) => r.status === "COMPLETED")
    .slice(0, 10)
    .map((r) => r.id)

  let allMetrics: { auditRunId: string; key: string; value: number }[] = []
  if (completedRunIds.length > 0) {
    const { data: m } = await supabase
      .from("Metric")
      .select("auditRunId, key, value")
      .in("auditRunId", completedRunIds)
      .in("key", ["performance", "accessibility", "best-practices", "seo"])
    allMetrics = (m ?? []) as { auditRunId: string; key: string; value: number }[]
  }

  const latestMetrics = allMetrics.filter((m) => m.auditRunId === latestCompleted?.id)
  const scoreMap = Object.fromEntries(latestMetrics.map((m) => [m.key, m.value]))

  const trendData: ScoreTrendPoint[] = completedRunIds
    .slice()
    .reverse()
    .map((runId) => {
      const run = typedRuns.find((r) => r.id === runId)!
      const runMetrics = allMetrics.filter((m) => m.auditRunId === runId)
      const metricMap = Object.fromEntries(runMetrics.map((m) => [m.key, m.value]))
      return {
        date: new Date(run.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
        performance:   metricMap["performance"]   !== undefined ? Math.round(metricMap["performance"])   : undefined,
        accessibility: metricMap["accessibility"]  !== undefined ? Math.round(metricMap["accessibility"])  : undefined,
        bestPractices: metricMap["best-practices"] !== undefined ? Math.round(metricMap["best-practices"]) : undefined,
        seo:           metricMap["seo"]            !== undefined ? Math.round(metricMap["seo"])            : undefined,
      }
    })

  // Site preview URL via Microlink (no API key needed for basic usage)
  const previewUrl = `https://api.microlink.io/?url=${encodeURIComponent(typedProject.url)}&screenshot=true&meta=false&embed=screenshot.url`

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Breadcrumb + title ──────────────────────────────────────── */}
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: "oklch(0.50 0.010 265)" }}
        >
          <ChevronLeft className="size-3" />
          Projects
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "oklch(0.65 0.22 258 / 12%)",
                border: "1px solid oklch(0.65 0.22 258 / 25%)",
              }}
            >
              <Globe className="size-4" style={{ color: "oklch(0.65 0.22 258)" }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{typedProject.name}</h1>
              <a
                href={typedProject.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs transition-colors hover:underline"
                style={{ color: "oklch(0.50 0.010 265)" }}
              >
                {typedProject.url}
                <ExternalLink className="size-2.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {latestRun && <StatusBadge status={latestRun.status} />}
            <RunAuditButton projectId={typedProject.id} />
            <DeleteProjectButton projectId={typedProject.id} projectName={typedProject.name} />
          </div>
        </div>
      </div>

      {/* ── 3-column main area ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_220px]">

        {/* ── Left: Score cards ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.45 0.010 265)" }}
          >
            Audit Scores
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <ScoreRing value={scoreMap["performance"]}   label="Performance"   icon={Gauge} />
            <ScoreRing value={scoreMap["seo"]}           label="SEO"           icon={BarChart2} />
            <ScoreRing value={scoreMap["accessibility"]} label="Accessibility" icon={Eye} />
            <ScoreRing value={scoreMap["best-practices"]} label="Best Practices" icon={ShieldCheck} />
          </div>

          {/* Last audit */}
          {latestCompleted && (
            <div
              className="rounded-xl p-3 space-y-2 text-xs"
              style={{
                background: "oklch(0.13 0.006 265)",
                border: "1px solid oklch(1 0 0 / 7%)",
              }}
            >
              <p className="font-medium" style={{ color: "oklch(0.65 0.22 258)" }}>
                Last Audit
              </p>
              <p style={{ color: "oklch(0.55 0.010 265)" }}>
                {formatDate(latestCompleted.createdAt)}
              </p>
              <p style={{ color: "oklch(0.45 0.010 265)" }}>
                Duration: {formatDuration(latestCompleted.startedAt, latestCompleted.finishedAt)}
              </p>
            </div>
          )}
        </div>

        {/* ── Center: Site preview ───────────────────────────────── */}
        <div
          className="flex flex-col gap-3 rounded-2xl overflow-hidden"
          style={{
            background: "oklch(0.11 0.007 265)",
            border: "1px solid oklch(1 0 0 / 7%)",
          }}
        >
          {/* Browser chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
          >
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full" style={{ background: "oklch(0.628 0.258 29 / 60%)" }} />
              <div className="size-2.5 rounded-full" style={{ background: "oklch(0.769 0.188 70 / 60%)" }} />
              <div className="size-2.5 rounded-full" style={{ background: "oklch(0.627 0.194 145 / 60%)" }} />
            </div>
            <div
              className="flex-1 rounded-md px-3 py-1 text-xs truncate font-mono"
              style={{
                background: "oklch(0.08 0.006 265)",
                color: "oklch(0.50 0.010 265)",
                border: "1px solid oklch(1 0 0 / 6%)",
              }}
            >
              {typedProject.url}
            </div>
            <a
              href={typedProject.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 transition-opacity hover:opacity-70"
              style={{ color: "oklch(0.45 0.010 265)" }}
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <SitePreviewImage
              src={previewUrl}
              alt={`Preview of ${typedProject.name}`}
              url={typedProject.url}
            />
        </div>

        {/* ── Right: Site info ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.45 0.010 265)" }}
          >
            Site Info
          </p>

          {/* Info cards */}
          {[
            {
              icon: Globe,
              label: "URL",
              value: typedProject.url.replace(/^https?:\/\//, ""),
            },
            {
              icon: Calendar,
              label: "Added",
              value: new Date(typedProject.createdAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            },
            {
              icon: TrendingUp,
              label: "Total Runs",
              value: String(typedRuns.length),
            },
            {
              icon: Timer,
              label: "Status",
              value: latestRun?.status ?? "No runs",
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{
                background: "oklch(0.13 0.006 265)",
                border: "1px solid oklch(1 0 0 / 7%)",
              }}
            >
              <div
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "oklch(0.65 0.22 258 / 10%)" }}
              >
                <Icon className="size-3.5" style={{ color: "oklch(0.65 0.22 258)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest"
                  style={{ color: "oklch(0.45 0.010 265)" }}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-xs font-medium truncate"
                  style={{ color: "oklch(0.80 0.008 265)" }}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}

          {/* Quick links */}
          <div className="space-y-1.5 mt-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "oklch(0.45 0.010 265)" }}
            >
              Quick Access
            </p>
            {[
              { label: "SEO Report",   href: `/dashboard/${projectId}/seo` },
              { label: "Pages",        href: `/dashboard/${projectId}/pages` },
              { label: "Security",     href: `/dashboard/${projectId}/security` },
              { label: "Broken Links", href: `/dashboard/${projectId}/links` },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background: "oklch(0.13 0.006 265)",
                  border: "1px solid oklch(1 0 0 / 6%)",
                  color: "oklch(0.65 0.010 265)",
                }}
              >
                {label}
                <ChevronLeft className="size-3 rotate-180" style={{ color: "oklch(0.40 0.010 265)" }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Score trend chart ──────────────────────────────────────── */}
      {trendData.length > 1 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "oklch(0.13 0.006 265)",
            border: "1px solid oklch(1 0 0 / 7%)",
          }}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-tight">Score Trends</h2>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.010 265)" }}>
              Last {trendData.length} completed audits
            </p>
          </div>
          <ScoreTrendChart data={trendData} />
        </div>
      )}

      {/* ── Comments ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "oklch(0.13 0.006 265)",
          border: "1px solid oklch(1 0 0 / 7%)",
        }}
      >
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-tight">Comments</h2>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.010 265)" }}>
            {latestRun ? "Notes on the latest audit run." : "Project-level notes."}
          </p>
        </div>
        <CommentThread
          projectId={typedProject.id}
          auditRunId={latestRun?.id}
          currentUserId={user.id}
        />
      </div>

      {/* ── Audit history table ────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.006 265)",
          border: "1px solid oklch(1 0 0 / 7%)",
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
          <h2 className="text-sm font-bold tracking-tight">Audit History</h2>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.010 265)" }}>
            {typedRuns.length === 0
              ? "Run your first audit to see results here."
              : `${typedRuns.length} audit run${typedRuns.length !== 1 ? "s" : ""} recorded.`}
          </p>
        </div>
        {typedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Clock className="size-8" style={{ color: "oklch(0.30 0.010 265)" }} />
            <p className="mt-3 text-sm" style={{ color: "oklch(0.45 0.010 265)" }}>
              No audit runs yet. Click <strong>Run Audit</strong> to begin.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                <TableHead className="text-xs" style={{ color: "oklch(0.45 0.010 265)" }}>Status</TableHead>
                <TableHead className="text-xs" style={{ color: "oklch(0.45 0.010 265)" }}>Started</TableHead>
                <TableHead className="text-xs" style={{ color: "oklch(0.45 0.010 265)" }}>Duration</TableHead>
                <TableHead className="text-xs" style={{ color: "oklch(0.45 0.010 265)" }}>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedRuns.map((run) => (
                <TableRow key={run.id} style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
                  <TableCell><StatusBadge status={run.status} /></TableCell>
                  <TableCell className="text-xs" style={{ color: "oklch(0.52 0.010 265)" }}>
                    {formatDate(run.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs" style={{ color: "oklch(0.52 0.010 265)" }}>
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {run.errorMessage ? (
                      <span className="text-xs truncate block" style={{ color: "oklch(0.628 0.258 29)" }}>
                        {run.errorMessage}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "oklch(0.32 0.010 265)" }}>—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
