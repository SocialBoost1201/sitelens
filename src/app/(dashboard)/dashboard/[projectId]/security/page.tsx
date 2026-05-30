// Security Scan page — /dashboard/[projectId]/security

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Lock, LockOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RunSecurityButton } from "./run-security-button"
import type { SecurityScanResult, HeaderCheck, HeaderStatus, SecurityGrade } from "@/lib/services/security-scanner"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Security — SiteLens` : "Security — SiteLens" }
}

function StatusIcon({ status }: { status: HeaderStatus }) {
  if (status === "pass")    return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
  if (status === "warning") return <AlertTriangle className="size-4 text-amber-500 shrink-0" />
  return <XCircle className="size-4 text-red-500 shrink-0" />
}

function GradeBadge({ grade }: { grade: SecurityGrade }) {
  const map: Record<SecurityGrade, string> = {
    "A+": "bg-emerald-500 text-white",
    "A":  "bg-emerald-400 text-white",
    "B":  "bg-blue-500 text-white",
    "C":  "bg-amber-500 text-white",
    "D":  "bg-orange-500 text-white",
    "F":  "bg-red-500 text-white",
  }
  return (
    <div className={`flex items-center justify-center size-20 rounded-2xl text-4xl font-bold tabular-nums ${map[grade]}`}>
      {grade}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

function HeaderRow({ check }: { check: HeaderCheck }) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b last:border-0">
      <StatusIcon status={check.status} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-medium">{check.name}</span>
          {check.present && (
            <span className="text-xs text-muted-foreground truncate max-w-xs font-mono">{check.value}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
        {check.status !== "pass" && (
          <p className="text-xs text-blue-600 mt-1">
            <span className="font-medium">Recommended: </span>
            <span className="font-mono">{check.recommendation}</span>
          </p>
        )}
      </div>
      <div className="text-right shrink-0 text-sm font-mono">
        <span className={check.score === check.maxScore ? "text-emerald-600" : check.score > 0 ? "text-amber-600" : "text-red-600"}>
          {check.score}
        </span>
        <span className="text-muted-foreground">/{check.maxScore}</span>
      </div>
    </div>
  )
}

export default async function SecurityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  const { data: results } = await supabase
    .from("SecurityResult")
    .select("id, url, scannedAt, grade, score, data")
    .eq("projectId", projectId)
    .order("scannedAt", { ascending: false })
    .limit(1)

  const latest = results?.[0] ?? null
  const scan = latest?.data as SecurityScanResult | null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Security</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Security Headers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {latest
              ? `Last scanned: ${new Date(latest.scannedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "No scan yet"}
          </p>
        </div>
        <RunSecurityButton projectId={projectId} />
      </div>

      {/* Empty state */}
      {!scan && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldCheck className="size-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No security scan yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &quot;Run Security Scan&quot; to check HTTP security headers including CSP, HSTS, and more.
            </p>
          </CardContent>
        </Card>
      )}

      {scan && (
        <>
          {/* Score overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Grade + score card */}
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Security Grade</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  {scan.https
                    ? <><Lock className="size-3.5 text-emerald-500" /> HTTPS enabled</>
                    : <><LockOpen className="size-3.5 text-red-500" /> HTTP only — −20pt penalty</>
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <GradeBadge grade={scan.grade} />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-mono font-medium">{scan.score} / 100</span>
                  </div>
                  <ScoreBar score={scan.score} />
                  <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
                    <div className="rounded-md bg-emerald-500/10 text-emerald-600 py-1 font-medium">{scan.summary.passed} passed</div>
                    <div className="rounded-md bg-amber-500/10 text-amber-600 py-1 font-medium">{scan.summary.warnings} warn</div>
                    <div className="rounded-md bg-red-500/10 text-red-600 py-1 font-medium">{scan.summary.failed} failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical fails quick-win cards */}
            {scan.headers
              .filter(h => h.status === "fail")
              .slice(0, 2)
              .map(h => (
                <Card key={h.name} className="border-red-200/50 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <XCircle className="size-4 text-red-500 shrink-0" />
                      <span className="font-mono truncate">{h.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{h.detail}</p>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Header checks table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Header Checks</CardTitle>
              <CardDescription>OWASP security header recommendations — 100pt total</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {scan.headers.map((check) => (
                  <HeaderRow key={check.name} check={check} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
