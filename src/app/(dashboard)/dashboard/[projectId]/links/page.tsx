// Broken Links page — /dashboard/[projectId]/links

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Link2, Link2Off, ExternalLink, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RunLinksButton } from "./run-links-button"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Links — SiteLens` : "Links — SiteLens" }
}

interface BrokenLinkRow {
  id: string
  pageUrl: string
  linkUrl: string
  statusCode: number | null
  error: string | null
  checkedAt: string
}

function StatusCodeBadge({ code }: { code: number | null }) {
  if (code === null) return <Badge variant="outline" className="font-mono text-xs border-red-200 text-red-600 bg-red-500/10">Timeout</Badge>
  if (code >= 500) return <Badge variant="outline" className="font-mono text-xs border-orange-200 text-orange-600 bg-orange-500/10">{code}</Badge>
  if (code >= 400) return <Badge variant="outline" className="font-mono text-xs border-red-200 text-red-600 bg-red-500/10">{code}</Badge>
  return <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
}

export default async function LinksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  const { data: links } = await supabase
    .from("BrokenLink")
    .select("id, pageUrl, linkUrl, statusCode, error, checkedAt")
    .eq("projectId", projectId)
    .order("checkedAt", { ascending: false })
    .limit(200)

  const rows = (links ?? []) as BrokenLinkRow[]

  // Latest checkedAt (all rows from same scan share timestamp)
  const lastChecked = rows[0]?.checkedAt ?? null

  // Group by statusCode for summary
  const timeouts = rows.filter(r => r.statusCode === null).length
  const notFound4xx = rows.filter(r => r.statusCode !== null && r.statusCode >= 400 && r.statusCode < 500).length
  const serverErr5xx = rows.filter(r => r.statusCode !== null && r.statusCode >= 500).length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Broken Links</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Broken Links</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastChecked
              ? `Last checked: ${new Date(lastChecked).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "No check yet"}
          </p>
        </div>
        <RunLinksButton projectId={projectId} />
      </div>

      {/* Empty — never checked */}
      {rows.length === 0 && lastChecked === null && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Link2 className="size-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No link check yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &quot;Check Broken Links&quot; to crawl all <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;a href&gt;</code> tags on the project URL.
            </p>
          </CardContent>
        </Card>
      )}

      {/* All clear */}
      {rows.length === 0 && lastChecked !== null && (
        <Card className="border-emerald-200/50 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="size-10 text-emerald-500" />
            <h3 className="mt-4 font-semibold text-emerald-700">All links are healthy</h3>
            <p className="mt-1 text-sm text-muted-foreground">No broken links were found during the last check.</p>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <Link2Off className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
                    <p className="text-xs text-muted-foreground">Total broken</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertCircle className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{notFound4xx}</p>
                    <p className="text-xs text-muted-foreground">4xx errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <AlertCircle className="size-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{serverErr5xx + timeouts}</p>
                    <p className="text-xs text-muted-foreground">5xx / timeouts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Links table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Broken Links</CardTitle>
              <CardDescription>
                {rows.length} broken {rows.length === 1 ? "link" : "links"} found on {project.url}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-start gap-4 px-6 py-3">
                    <Link2Off className="size-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={row.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-foreground hover:text-primary truncate flex items-center gap-1"
                        >
                          {row.linkUrl}
                          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                        </a>
                      </div>
                      {row.error && (
                        <p className="text-xs text-muted-foreground">{row.error}</p>
                      )}
                    </div>
                    <StatusCodeBadge code={row.statusCode} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
