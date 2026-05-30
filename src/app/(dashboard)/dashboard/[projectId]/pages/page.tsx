// Pages list — /dashboard/[projectId]/pages
//
// Shows all URLs discovered by the sitemap crawler.
// Each row has an "Audit" button that runs a per-page PSI audit.

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Globe, ScanSearch, ExternalLink, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CrawlButton } from "./crawl-button"
import { AuditPageButton } from "./audit-page-button"

type PageUrl = {
  id: string
  url: string
  discoveredAt: string
  lastAuditedAt: string | null
  lastAuditRunId: string | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Pages — SiteLens` : "Pages — SiteLens" }
}

export default async function PagesPage({
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

  const { data: project, error: projectError } = await supabase
    .from("Project")
    .select("id, name, url")
    .eq("id", projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: pages } = await supabase
    .from("PageUrl")
    .select("id, url, discoveredAt, lastAuditedAt, lastAuditRunId")
    .eq("projectId", projectId)
    .order("url", { ascending: true })

  const pageList = (pages ?? []) as PageUrl[]

  function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Pages</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageList.length === 0
              ? "No pages discovered yet. Click \"Scan Pages\" to crawl the sitemap."
              : `${pageList.length} page${pageList.length !== 1 ? "s" : ""} discovered from ${project.url}`}
          </p>
        </div>
        <CrawlButton projectId={projectId} />
      </div>

      {/* Empty state */}
      {pageList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ScanSearch className="size-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No pages yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              SiteLens will try to discover pages from sitemap.xml, robots.txt, or by crawling your homepage links.
            </p>
            <CrawlButton projectId={projectId} />
          </CardContent>
        </Card>
      )}

      {/* Pages table */}
      {pageList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Discovered Pages</CardTitle>
                <CardDescription>Click Audit to run a PageSpeed analysis on any page.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">URL</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead>Last Audited</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageList.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-mono text-xs">
                          {page.url.replace(new URL(page.url).origin, "") || "/"}
                        </span>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground/50 hover:text-primary"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(page.discoveredAt)}
                    </TableCell>
                    <TableCell>
                      {page.lastAuditedAt ? (
                        <span className="text-sm text-muted-foreground">{formatDate(page.lastAuditedAt)}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <Clock className="mr-1 size-3" />
                          Not yet
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AuditPageButton
                        projectId={projectId}
                        pageUrl={page.url}
                        pageId={page.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
