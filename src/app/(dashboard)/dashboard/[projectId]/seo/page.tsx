// SEO Audit page — /dashboard/[projectId]/seo
// Designed with the marketing:seo-audit + seo-schema skill frameworks.

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle,
  Code2, FileText,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RunSeoButton } from "./run-seo-button"
import type { SeoAnalysisResult, SeoCheck, SeoCheckStatus, JsonLdResult } from "@/lib/services/seo-analyzer"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — SEO — SiteLens` : "SEO — SiteLens" }
}

function StatusIcon({ status }: { status: SeoCheckStatus }) {
  if (status === "pass")    return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
  if (status === "warning") return <AlertTriangle className="size-4 text-amber-500 shrink-0" />
  return <XCircle className="size-4 text-red-500 shrink-0" />
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500"
  return (
    <div className={`text-5xl font-bold tabular-nums ${color}`}>
      {score}<span className="text-xl text-muted-foreground font-normal ml-1">/ 100</span>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: SeoCheck["severity"] }) {
  const map = {
    critical: "bg-red-500/10 text-red-600 border-red-200",
    high:     "bg-orange-500/10 text-orange-600 border-orange-200",
    medium:   "bg-amber-500/10 text-amber-600 border-amber-200",
    low:      "bg-blue-500/10 text-blue-600 border-blue-200",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium ${map[severity]}`}>
      {severity}
    </span>
  )
}

function JsonLdStatusBadge({ status }: { status: JsonLdResult["status"] }) {
  const map = { pass: "bg-emerald-500/10 text-emerald-600 border-emerald-200", warning: "bg-amber-500/10 text-amber-600 border-amber-200", fail: "bg-red-500/10 text-red-600 border-red-200" }
  return <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium ${map[status]}`}>{status.toUpperCase()}</span>
}

export default async function SeoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  const { data: results } = await supabase
    .from("SeoResult")
    .select("id, url, analyzedAt, score, data")
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(1)

  const latest = results?.[0] ?? null
  const analysis = latest?.data as SeoAnalysisResult | null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">SEO</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO Audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {latest ? `Last analyzed: ${new Date(latest.analyzedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "No analysis yet"}
          </p>
        </div>
        <RunSeoButton projectId={projectId} />
      </div>

      {/* No data state */}
      {!analysis && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="size-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No SEO analysis yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Click &quot;Run SEO Audit&quot; to analyze title, meta tags, OGP, structured data, and more.</p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <>
          {/* Score + summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overall SEO Score</CardTitle>
                <CardDescription>{analysis.url}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end gap-6">
                <ScoreRing score={analysis.score} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pb-1">
                  <span className="text-red-500 font-medium">{analysis.summary.critical} critical</span>
                  <span className="text-orange-500 font-medium">{analysis.summary.high} high</span>
                  <span className="text-amber-500 font-medium">{analysis.summary.medium} medium</span>
                  <span className="text-emerald-500 font-medium">{analysis.summary.passed} passed</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick-win cards */}
            {analysis.checks.filter(c => c.status === "fail" && (c.severity === "critical" || c.severity === "high")).slice(0, 2).map(c => (
              <Card key={c.id} className="border-red-200/50 bg-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <XCircle className="size-4 text-red-500" />
                    {c.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Checks table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Check Results</CardTitle>
              <CardDescription>Scored against the seo-audit skill framework (100pt total)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {analysis.checks.map((check) => (
                  <div key={check.id} className="flex items-center gap-4 px-6 py-3">
                    <StatusIcon status={check.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{check.label}</span>
                        <SeverityBadge severity={check.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.detail}</p>
                      {check.value && check.value.length < 200 && (
                        <p className="text-xs font-mono text-muted-foreground/70 mt-0.5 truncate">{check.value}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono">{check.score}</span>
                      <span className="text-xs text-muted-foreground">/{check.maxScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* JSON-LD structured data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="size-4" />
                Structured Data (JSON-LD)
              </CardTitle>
              <CardDescription>Validated against Schema.org required properties (seo-schema skill)</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.jsonLd.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No JSON-LD blocks found on this page.</p>
              ) : (
                <div className="space-y-4">
                  {analysis.jsonLd.map((jld, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{jld.type}</Badge>
                        <JsonLdStatusBadge status={jld.status} />
                      </div>
                      {jld.issues.length > 0 && (
                        <ul className="space-y-1">
                          {jld.issues.map((issue, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-amber-600">
                              <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                      {jld.issues.length === 0 && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> All required properties present
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
