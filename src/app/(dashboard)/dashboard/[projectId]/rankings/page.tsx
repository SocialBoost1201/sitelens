// Rankings page — /dashboard/[projectId]/rankings
// Keyword & rank tracking axis (Doc-11 / BL-01). Shows tracked keywords, their
// current Google position, movement, per-keyword trend, and NON-SCORED
// improvement actions. Rankings are not a scored axis at MVP (approval-gated).

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { TrendingUp, Lightbulb, AlertTriangle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deriveRankRecommendations, type RankSeverity } from "@/lib/rank/recommendations"
import { KeywordManager, type KeywordView } from "./keyword-manager"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Rankings — SiteLens` : "Rankings — SiteLens" }
}

const SEV_STYLE: Record<RankSeverity, string> = {
  critical: "text-red-600",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-emerald-500",
}

export default async function RankingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name").eq("id", projectId).single()
  if (error || !project) notFound()

  const { data: rows } = await supabase
    .from("TrackedKeyword")
    .select("id, keyword, targetUrl, country, language, device, enabled, lastCheckedAt, lastPosition, createdAt")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })

  const keywords = rows ?? []
  const ids = keywords.map((k) => k.id)

  // Pull recent history for all keywords in one query, then group.
  const historyByKeyword = new Map<string, { date: string; position: number | null }[]>()
  if (ids.length > 0) {
    const { data: snaps } = await supabase
      .from("KeywordRankSnapshot")
      .select("keywordId, position, capturedAt")
      .in("keywordId", ids)
      .order("capturedAt", { ascending: true })
      .limit(2000)
    for (const s of snaps ?? []) {
      const arr = historyByKeyword.get(s.keywordId) ?? []
      arr.push({
        date: new Date(s.capturedAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
        position: s.position,
      })
      historyByKeyword.set(s.keywordId, arr)
    }
  }

  const views: KeywordView[] = keywords.map((k) => {
    const history = historyByKeyword.get(k.id) ?? []
    const positions = history.map((h) => h.position)
    const current = positions.length > 0 ? positions[positions.length - 1] : k.lastPosition
    const previous = positions.length > 1 ? positions[positions.length - 2] : null
    return {
      id: k.id,
      keyword: k.keyword,
      targetUrl: k.targetUrl,
      country: k.country,
      language: k.language,
      device: k.device,
      enabled: k.enabled,
      lastCheckedAt: k.lastCheckedAt,
      current,
      previous,
      history,
    }
  })

  const recommendations = deriveRankRecommendations(
    views.map((v) => ({ keyword: v.keyword, current: v.current, previous: v.previous })),
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Rankings</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <TrendingUp className="size-6" />
          Keyword Rankings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your Google organic position for target keywords over time. Fetched via an external
          SERP provider (no scraping). Rankings are informational and do not affect any audit score.
        </p>
      </div>

      <KeywordManager projectId={projectId} keywords={views} />

      {/* Improvement actions (non-scored) */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Improvement actions</CardTitle>
            <CardDescription>Suggestions based on position movement — informational only, not scored.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recommendations.map((r, i) => (
                <div key={`${r.keyword}-${i}`} className="px-6 py-3.5">
                  <div className="flex items-start gap-3">
                    {r.severity === "high" || r.severity === "critical"
                      ? <XCircle className={`size-4 mt-0.5 shrink-0 ${SEV_STYLE[r.severity]}`} />
                      : <AlertTriangle className={`size-4 mt-0.5 shrink-0 ${SEV_STYLE[r.severity]}`} />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{r.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-start gap-1.5">
                        <Lightbulb className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                        <span>{r.recommendation}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
