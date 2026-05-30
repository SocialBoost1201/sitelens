// Public share view — /share/[slug]
// Fully public, no auth required.
// Reads PublicShare by slug, then shows a read-only audit snapshot.

import { notFound } from "next/navigation"
import Link from "next/link"
import { Zap, Search, ShieldCheck, Link2Off, Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SeoAnalysisResult } from "@/lib/services/seo-analyzer"
import type { SecurityScanResult } from "@/lib/services/security-scanner"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: share } = await supabase
    .from("PublicShare")
    .select("projectId")
    .eq("slug", slug)
    .eq("enabled", true)
    .single()
  if (!share) return { title: "Share not found — SiteLens" }

  const { data: project } = await supabase
    .from("Project").select("name").eq("id", share.projectId).single()
  return { title: project ? `${project.name} — Audit Report — SiteLens` : "Audit Report — SiteLens" }
}

function ScorePill({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-500/10 border-emerald-200"
              : score >= 50 ? "text-amber-600 bg-amber-500/10 border-amber-200"
              : "text-red-600 bg-red-500/10 border-red-200"
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border px-6 py-4 ${color}`}>
      <span className="text-3xl font-bold tabular-nums">{score}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
  )
}

export default async function PublicSharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Lookup share — RLS allows anon reads of enabled non-expired shares
  const { data: share } = await supabase
    .from("PublicShare")
    .select("id, projectId, expiresAt, enabled")
    .eq("slug", slug)
    .single()

  if (!share || !share.enabled) notFound()
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) notFound()

  const { data: project } = await supabase
    .from("Project").select("id, name, url").eq("id", share.projectId).single()
  if (!project) notFound()

  // Latest completed audit
  const { data: runs } = await supabase
    .from("AuditRun")
    .select("id, finishedAt")
    .eq("projectId", share.projectId)
    .eq("status", "COMPLETED")
    .order("finishedAt", { ascending: false })
    .limit(1)

  const latestRun = runs?.[0] ?? null

  const { data: metrics } = latestRun
    ? await supabase.from("Metric").select("key, value").eq("auditRunId", latestRun.id)
    : { data: null }
  const metricMap = Object.fromEntries((metrics ?? []).map(m => [m.key, Math.round(m.value)]))

  // SEO + Security + Broken links
  const { data: seoResults } = await supabase
    .from("SeoResult").select("score, data, analyzedAt")
    .eq("projectId", share.projectId).order("analyzedAt", { ascending: false }).limit(1)
  const seo = seoResults?.[0] ?? null
  const seoAnalysis = seo?.data as SeoAnalysisResult | null

  const { data: secResults } = await supabase
    .from("SecurityResult").select("grade, score, scannedAt, data")
    .eq("projectId", share.projectId).order("scannedAt", { ascending: false }).limit(1)
  const security = secResults?.[0] ?? null
  const secScan = security?.data as SecurityScanResult | null

  const { count: brokenCount } = await supabase
    .from("BrokenLink").select("id", { count: "exact", head: true }).eq("projectId", share.projectId)

  // Uptime
  const { data: monitors } = await supabase
    .from("UptimeMonitor")
    .select("url, lastStatus, lastLatencyMs, lastCheckedAt")
    .eq("projectId", share.projectId)
    .eq("enabled", true)

  const generatedAt = new Date().toLocaleString("en", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">SiteLens</span>
          </div>
          <div className="text-xs text-muted-foreground">Public Audit Report</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Project header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-muted-foreground">
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {project.url}
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-2">Report generated: {generatedAt}</p>
        </div>

        {/* Score grid */}
        {latestRun ? (
          <section>
            <h2 className="text-lg font-semibold mb-4">Performance Scores</h2>
            <div className="flex flex-wrap gap-3">
              {metricMap["performance"]   !== undefined && <ScorePill score={metricMap["performance"]}   label="Performance" />}
              {metricMap["accessibility"] !== undefined && <ScorePill score={metricMap["accessibility"]} label="Accessibility" />}
              {metricMap["best-practices"] !== undefined && <ScorePill score={metricMap["best-practices"]} label="Best Practices" />}
              {metricMap["seo"]           !== undefined && <ScorePill score={metricMap["seo"]}           label="SEO (PSI)" />}
              {seo && <ScorePill score={seo.score ?? 0}              label="SEO Audit" />}
              {security && <ScorePill score={security.score ?? 0}    label="Security" />}
            </div>
          </section>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No audit data available yet.</CardContent>
          </Card>
        )}

        {/* SEO highlights */}
        {seoAnalysis && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="size-4" /> SEO Audit — {seoAnalysis.score}/100
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-red-500/10 border border-red-200/50 p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{seoAnalysis.summary.critical}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Critical</p>
                </div>
                <div className="rounded-lg bg-orange-500/10 border border-orange-200/50 p-3 text-center">
                  <p className="text-xl font-bold text-orange-600">{seoAnalysis.summary.high}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">High</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-200/50 p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{seoAnalysis.summary.medium}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Medium</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-200/50 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{seoAnalysis.summary.passed}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security summary */}
        {secScan && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4" /> Security Headers — Grade {secScan.grade}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <div><span className="text-emerald-600 font-bold text-lg">{secScan.summary.passed}</span> <span className="text-muted-foreground text-xs">passed</span></div>
                <div><span className="text-amber-600 font-bold text-lg">{secScan.summary.warnings}</span> <span className="text-muted-foreground text-xs">warnings</span></div>
                <div><span className="text-red-600 font-bold text-lg">{secScan.summary.failed}</span> <span className="text-muted-foreground text-xs">failed</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Broken links */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2Off className="size-4" /> Broken Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {brokenCount === 0
                ? "No broken links found."
                : `${brokenCount} broken ${brokenCount === 1 ? "link" : "links"} detected.`}
            </p>
          </CardContent>
        </Card>

        {/* Uptime */}
        {(monitors ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4" /> Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(monitors ?? []).map((m, i) => {
                  const statusColor = m.lastStatus === "UP" ? "text-emerald-600"
                    : m.lastStatus === "DOWN" ? "text-red-600" : "text-amber-600"
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`font-medium text-xs ${statusColor}`}>{m.lastStatus ?? "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground flex-1 truncate">{m.url}</span>
                      {m.lastLatencyMs !== null && (
                        <span className="text-xs text-muted-foreground">{m.lastLatencyMs}ms</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground pb-8">
          Powered by{" "}
          <Link href="/" className="hover:underline font-medium">SiteLens</Link>
          {" "}· Report may be expired or revoked at any time
        </p>
      </main>
    </div>
  )
}
