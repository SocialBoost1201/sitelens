// Audit Report page — /dashboard/[projectId]/report
// Renders a print-optimised full-page report.
// Uses window.print() (browser PDF) — no server-side PDF dependency needed.

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck,
  Link2Off, Search, Zap, ArrowLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PrintButton } from "./print-button"
import type { SeoAnalysisResult, SeoCheck } from "@/lib/services/seo-analyzer"
import type { SecurityScanResult } from "@/lib/services/security-scanner"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Report — SiteLens` : "Report — SiteLens" }
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16 flex items-center justify-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
          <circle
            cx="28" cy="28" r="24" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${(score / 100) * 150.8} 150.8`}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  )
}

function SeoStatusIcon({ status }: { status: SeoCheck["status"] }) {
  if (status === "pass")    return <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
  if (status === "warning") return <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
  return <XCircle className="size-3.5 text-red-500 shrink-0" />
}

export default async function ReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  // Latest audit run scores
  const { data: auditRuns } = await supabase
    .from("AuditRun")
    .select("id, status, finishedAt")
    .eq("projectId", projectId)
    .eq("status", "COMPLETED")
    .order("finishedAt", { ascending: false })
    .limit(1)

  const latestRun = auditRuns?.[0] ?? null

  // Latest metrics
  const { data: metrics } = latestRun
    ? await supabase
        .from("Metric")
        .select("key, value")
        .eq("auditRunId", latestRun.id)
    : { data: null }

  const metricMap = Object.fromEntries((metrics ?? []).map(m => [m.key, Math.round(m.value)]))

  // Latest SEO result
  const { data: seoResults } = await supabase
    .from("SeoResult")
    .select("score, data, analyzedAt")
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(1)
  const seo = seoResults?.[0] ?? null
  const seoAnalysis = seo?.data as SeoAnalysisResult | null

  // Latest security result
  const { data: secResults } = await supabase
    .from("SecurityResult")
    .select("grade, score, scannedAt, data")
    .eq("projectId", projectId)
    .order("scannedAt", { ascending: false })
    .limit(1)
  const security = secResults?.[0] ?? null
  const secScan = security?.data as SecurityScanResult | null

  // Broken link count
  const { count: brokenCount } = await supabase
    .from("BrokenLink")
    .select("id", { count: "exact", head: true })
    .eq("projectId", projectId)

  const generatedAt = new Date().toLocaleString("en", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  return (
    <>
      {/* Toolbar — hidden during print */}
      <div className="print:hidden mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/dashboard/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to project
        </Link>
        <PrintButton />
      </div>

      {/* ── Report document ── */}
      <div className="max-w-4xl mx-auto space-y-8 print:space-y-6">

        {/* Cover / Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="size-5 text-primary" />
              <span className="text-sm font-semibold tracking-tight text-primary">SiteLens</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              <a href={project.url} className="hover:underline">{project.url}</a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">Generated: {generatedAt}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Audit Report</p>
            {latestRun?.finishedAt && (
              <p>Last audit: {new Date(latestRun.finishedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p>
            )}
          </div>
        </div>

        {/* Score overview */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Performance Scores</h2>
          {latestRun ? (
            <div className="flex gap-8 flex-wrap">
              <ScoreCircle score={metricMap["performance"] ?? 0}      label="Performance" />
              <ScoreCircle score={metricMap["accessibility"] ?? 0}     label="Accessibility" />
              <ScoreCircle score={metricMap["best-practices"] ?? 0}    label="Best Practices" />
              <ScoreCircle score={metricMap["seo"] ?? 0}               label="SEO (PSI)" />
              {seo && <ScoreCircle score={seo.score ?? 0}              label="SEO Audit" />}
              {security && <ScoreCircle score={security.score ?? 0}    label="Security" />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No audit data available yet.</p>
          )}
        </section>

        {/* SEO Section */}
        {seoAnalysis && (
          <section className="break-inside-avoid">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Search className="size-4" /> SEO Audit
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Score: <strong>{seoAnalysis.score}/100</strong> · {seoAnalysis.summary.critical} critical · {seoAnalysis.summary.high} high · {seoAnalysis.summary.passed} passed
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Check</th>
                    <th className="text-left px-3 py-2 font-medium">Detail</th>
                    <th className="text-right px-3 py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {seoAnalysis.checks.map((check) => (
                    <tr key={check.id}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <SeoStatusIcon status={check.status} />
                          <span className="font-medium">{check.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{check.detail}</td>
                      <td className="px-3 py-2 text-right font-mono">{check.score}/{check.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Security Section */}
        {secScan && (
          <section className="break-inside-avoid">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck className="size-4" /> Security Headers
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Grade: <strong>{secScan.grade}</strong> · Score: <strong>{secScan.score}/100</strong> · {secScan.summary.passed} passed · {secScan.summary.failed} failed
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Header</th>
                    <th className="text-left px-3 py-2 font-medium">Detail</th>
                    <th className="text-right px-3 py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {secScan.headers.map((h) => (
                    <tr key={h.name}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {h.status === "pass"    && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
                          {h.status === "warning" && <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />}
                          {h.status === "fail"    && <XCircle className="size-3.5 text-red-500 shrink-0" />}
                          <span className="font-mono">{h.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{h.detail}</td>
                      <td className="px-3 py-2 text-right font-mono">{h.score}/{h.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Broken links summary */}
        <section className="break-inside-avoid">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Link2Off className="size-4" /> Broken Links
          </h2>
          <p className="text-sm text-muted-foreground">
            {brokenCount === 0
              ? "No broken links found."
              : `${brokenCount} broken ${brokenCount === 1 ? "link" : "links"} detected. See the Broken Links tab for details.`}
          </p>
        </section>

        {/* Footer */}
        <div className="border-t pt-4 text-xs text-muted-foreground text-center print:fixed print:bottom-4 print:left-0 print:right-0">
          Report generated by SiteLens · {generatedAt}
        </div>
      </div>
    </>
  )
}
