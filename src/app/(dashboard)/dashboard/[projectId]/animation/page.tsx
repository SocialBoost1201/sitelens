import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, RefreshCcw, Sparkles, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { compareAnimationResults } from "@/lib/services/animation-comparison"
import { RunAnimationButton } from "./run-animation-button"
import { AnimationResultsPanel } from "./animation-results-panel"
import type {
  AnimationAnalysisResult,
  AnimationEntry,
  AnimationSource,
  AnimationTrigger,
} from "@/lib/services/animation-analyzer"

type AnimationResultRow = {
  id: string
  url: string
  analyzedAt: string
  totalCount: number
  gpuComposited: number
  nonComposited: number
  loopCount: number
  reducedMotion: boolean
  clsRisk: boolean
  data: AnimationAnalysisResult | null
}

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()

  return {
    title: data ? `${data.name} — Animation — SiteLens` : "Animation — SiteLens",
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MetricCard({
  title,
  value,
  description,
  tone = "default",
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  tone?: "default" | "emerald" | "amber"
  icon: typeof Sparkles
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  }[tone]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-lg ${toneClass}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground/80">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DiagnosticsBadge({
  label,
  active,
  positiveText,
  negativeText,
}: {
  label: string
  active: boolean
  positiveText: string
  negativeText: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge
        variant="outline"
        className={
          active
            ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
            : "border-amber-200 bg-amber-500/10 text-amber-600"
        }
      >
        {active ? positiveText : negativeText}
      </Badge>
    </div>
  )
}

function TriggerCount({ label, value }: { label: AnimationTrigger; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function SourceCount({ label, value }: { label: AnimationSource; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function DeltaBadge({ value }: { value: number }) {
  const className =
    value > 0
      ? "border-amber-200 bg-amber-500/10 text-amber-600"
      : value < 0
        ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
        : "border-muted bg-muted/40 text-muted-foreground"

  return (
    <Badge variant="outline" className={className}>
      {value > 0 ? `+${value}` : value}
    </Badge>
  )
}

function getRiskScore(entry: AnimationEntry) {
  let score = 0
  if (!entry.gpuComposited) score += 3
  if (entry.loop) score += 2
  if (entry.properties.some((property) => ["width", "height", "top", "left", "right", "bottom"].includes(property))) {
    score += 3
  }
  if (entry.properties.some((property) => property.includes("margin") || property.includes("padding"))) {
    score += 2
  }
  if (entry.properties.includes("filter") || entry.properties.includes("backdrop-filter")) {
    score += 2
  }
  if (entry.source === "scripted") score += 1
  return score
}

export default async function AnimationPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project")
    .select("id, name, url")
    .eq("id", projectId)
    .single()

  if (error || !project) notFound()

  const { data: rawResults, error: resultsError } = await supabase
    .from("AnimationResult")
    .select(
      "id, url, analyzedAt, totalCount, gpuComposited, nonComposited, loopCount, reducedMotion, clsRisk, data"
    )
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(10)

  const results = (rawResults ?? []).map((row) => ({
    ...row,
    data: row.data as AnimationAnalysisResult | null,
  })) as AnimationResultRow[]

  const latest = results[0] ?? null
  const previous = results[1] ?? null
  const analysis = latest?.data ?? null
  const previousAnalysis = previous?.data ?? null
  const animationRows = analysis?.animations.slice(0, 50) ?? []
  const history = results.slice(0, 5)
  const triggerSummary = analysis?.triggerSummary ?? {
    load: 0,
    hover: 0,
    scroll: 0,
    click: 0,
    focus: 0,
    loop: 0,
    unknown: 0,
  }
  const scenarioCoverage = analysis?.scenarioCoverage ?? {
    load: false,
    hover: false,
    scroll: false,
    click: false,
    focus: false,
  }
  const sourceSummary = analysis?.sourceSummary ?? {
    "css-animation": 0,
    "css-transition": 0,
    scripted: 0,
  }
  const comparison = analysis ? compareAnimationResults(analysis, previousAnalysis) : null
  const priorityAnimations = [...animationRows]
    .sort((a, b) => getRiskScore(b) - getRiskScore(a) || b.durationMs - a.durationMs)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="transition-colors hover:text-foreground">
          {project.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Animation</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Animation Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {latest ? `Last analyzed: ${formatTimestamp(latest.analyzedAt)}` : "No animation analysis yet"}
          </p>
        </div>
        <RunAnimationButton projectId={projectId} />
      </div>

      {resultsError && (
        <Card className="border-amber-200 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-700">Animation results are not readable yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {resultsError.message.includes("AnimationResult")
                ? "The AnimationResult table may not be provisioned in Supabase yet. Apply the animation migration, then run analysis again."
                : resultsError.message}
            </p>
          </CardContent>
        </Card>
      )}

      {!analysis && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="size-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No animation analysis yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No animation analysis yet. Click Run Analysis to start.
            </p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Animations"
              value={analysis.totalCount}
              description="Detected on the latest scan"
              icon={Sparkles}
            />
            <MetricCard
              title="GPU Composited"
              value={analysis.gpuComposited}
              description="Transform / opacity safe"
              tone="emerald"
              icon={Zap}
            />
            <MetricCard
              title="Non-Composited"
              value={analysis.nonComposited}
              description="May trigger layout or paint"
              tone="amber"
              icon={AlertTriangle}
            />
            <MetricCard
              title="Loop Animations"
              value={analysis.loopCount}
              description="Infinite or repeating motion"
              icon={RefreshCcw}
            />
          </div>

          {comparison && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Change Since Previous Run</CardTitle>
                <CardDescription>
                  {comparison.hasPrevious && previous
                    ? `Compared with ${formatTimestamp(previous.analyzedAt)}`
                    : "No previous run available yet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Total animations</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-lg font-semibold tabular-nums">{analysis.totalCount}</p>
                    <DeltaBadge value={comparison.totalDelta} />
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">GPU composited</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-lg font-semibold tabular-nums">{analysis.gpuComposited}</p>
                    <DeltaBadge value={comparison.gpuDelta} />
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Non-composited</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-lg font-semibold tabular-nums">{analysis.nonComposited}</p>
                    <DeltaBadge value={comparison.nonCompositedDelta} />
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Loop animations</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-lg font-semibold tabular-nums">{analysis.loopCount}</p>
                    <DeltaBadge value={comparison.loopDelta} />
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Newly detected</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{comparison.newlyDetectedCount}</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Removed</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{comparison.removedCount}</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">New risk items</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{comparison.newRiskCount}</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Trigger shifts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">load</span><DeltaBadge value={comparison.triggerDelta.load} />
                    <span className="text-xs text-muted-foreground">hover</span><DeltaBadge value={comparison.triggerDelta.hover} />
                    <span className="text-xs text-muted-foreground">scroll</span><DeltaBadge value={comparison.triggerDelta.scroll} />
                    <span className="text-xs text-muted-foreground">click</span><DeltaBadge value={comparison.triggerDelta.click} />
                    <span className="text-xs text-muted-foreground">focus</span><DeltaBadge value={comparison.triggerDelta.focus} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <DiagnosticsBadge
              label="prefers-reduced-motion"
              active={analysis.reducedMotion}
              positiveText="対応"
              negativeText="未対応"
            />
            <DiagnosticsBadge
              label="CLS リスク"
              active={!analysis.clsRisk}
              positiveText="なし"
              negativeText="あり"
            />
            <DiagnosticsBadge
              label="hover scenario"
              active={scenarioCoverage.hover}
              positiveText="captured"
              negativeText="not captured"
            />
            <DiagnosticsBadge
              label="scroll scenario"
              active={scenarioCoverage.scroll}
              positiveText="captured"
              negativeText="not captured"
            />
            <DiagnosticsBadge
              label="click scenario"
              active={scenarioCoverage.click}
              positiveText="captured"
              negativeText="not captured"
            />
            <DiagnosticsBadge
              label="focus scenario"
              active={scenarioCoverage.focus}
              positiveText="captured"
              negativeText="not captured"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trigger Summary</CardTitle>
                <CardDescription>Scenario-based counts from the latest run</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TriggerCount label="load" value={triggerSummary.load} />
                <TriggerCount label="hover" value={triggerSummary.hover} />
                <TriggerCount label="scroll" value={triggerSummary.scroll} />
                <TriggerCount label="click" value={triggerSummary.click} />
                <TriggerCount label="focus" value={triggerSummary.focus} />
                <TriggerCount label="loop" value={triggerSummary.loop} />
                <TriggerCount label="unknown" value={triggerSummary.unknown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Source Summary</CardTitle>
                <CardDescription>How the latest entries were produced</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <SourceCount label="css-animation" value={sourceSummary["css-animation"]} />
                <SourceCount label="css-transition" value={sourceSummary["css-transition"]} />
                <SourceCount label="scripted" value={sourceSummary.scripted} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Priority Review</CardTitle>
              <CardDescription>Highest-risk candidates from the latest run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityAnimations.map((entry, index) => (
                <div
                  key={`${entry.element}-${entry.trigger}-${index}`}
                  className="rounded-lg border px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-foreground">{entry.element}</p>
                    <Badge variant="outline" className="capitalize">{entry.trigger}</Badge>
                    <Badge variant="outline">{entry.source}</Badge>
                    <Badge
                      variant="outline"
                      className={entry.gpuComposited
                        ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
                        : "border-amber-200 bg-amber-500/10 text-amber-600"}
                    >
                      {entry.gpuComposited ? "GPU safe" : "Needs review"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {entry.properties.join(", ")} • {Math.round(entry.durationMs)} ms • {entry.detectionMode}
                  </p>
                </div>
              ))}
              {priorityAnimations.length === 0 && (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No high-priority animation candidates were found.
                </div>
              )}
            </CardContent>
          </Card>

          <AnimationResultsPanel animations={animationRows} analysisUrl={analysis.url} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Analysis History</CardTitle>
              <CardDescription>Latest 5 runs for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry) => {
                  const gpuRate = entry.totalCount > 0
                    ? Math.round((entry.gpuComposited / entry.totalCount) * 100)
                    : 0

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatTimestamp(entry.analyzedAt)}</p>
                        <p className="text-xs text-muted-foreground">{entry.url}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{entry.totalCount} total</span>
                        <span>{gpuRate}% GPU</span>
                        <Badge
                          variant="outline"
                          className={!entry.clsRisk
                            ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
                            : "border-amber-200 bg-amber-500/10 text-amber-600"}
                        >
                          {!entry.clsRisk ? "CLS safe" : "CLS risk"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                {history.length === 0 && (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No recent analysis history yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
