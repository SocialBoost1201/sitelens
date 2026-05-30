import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { cookies } from "next/headers"
import { headers } from "next/headers"
import { Activity, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SearchParams = Record<string, string | string[] | undefined>

type OverviewResponse = {
  location: {
    id: string
    title: string
    googleLocationId: string
  }
  metrics: Array<{
    id: string
    metricDate: string
    metricName: string
    metricValue: number
  }>
}

async function fetchOverview(locationId: string): Promise<OverviewResponse | null> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ")

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const proto = headerStore.get("x-forwarded-proto") ?? "http"
  const appUrl = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const response = await fetch(
    `${appUrl}/api/dashboard/gbp/overview?locationId=${locationId}`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    },
  )

  if (!response.ok) {
    return null
  }

  return response.json() as Promise<OverviewResponse>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  })

  return {
    title: project ? `${project.name} — Local SEO — SiteLens` : "Local SEO — SiteLens",
  }
}

export default async function GbpPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<SearchParams>
}) {
  const { projectId } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, userId: true },
  })

  if (!project || project.userId !== user.id) notFound()

  const integration = await db.googleIntegration.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })

  const locations = integration
    ? await db.gbpLocation.findMany({
        where: { googleIntegrationId: integration.id },
        orderBy: { title: "asc" },
      })
    : []

  const locationIdValue = resolvedSearchParams.locationId
  const selectedLocationId =
    typeof locationIdValue === "string"
      ? locationIdValue
      : locations[0]?.id

  const overview = selectedLocationId
    ? await fetchOverview(selectedLocationId)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Local SEO</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Activity className="size-6" />
            Local SEO
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Google Business Profile support metrics for local visibility analysis.
          </p>
        </div>
        {selectedLocationId && (
          <Button asChild variant="outline">
            <Link href={`/dashboard/${projectId}/gbp/locations`}>
              <RefreshCw className="mr-1.5 size-4" />
              Manage Locations
            </Link>
          </Button>
        )}
      </div>

      {locations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Local SEO locations connected</CardTitle>
            <CardDescription>
              Connect Google Business Profile and sync locations before fetching performance metrics.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {locations.length > 0 && !overview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No metrics available yet</CardTitle>
            <CardDescription>
              Use the sync API for one saved location, then reload this page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {locations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>
              Select a saved Google Business Profile location.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <Button
                key={location.id}
                asChild
                variant={selectedLocationId === location.id ? "default" : "outline"}
                size="sm"
              >
                <Link href={`/dashboard/${projectId}/gbp?locationId=${location.id}`}>
                  {location.title}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{overview.location.title}</CardTitle>
            <CardDescription>
              {overview.location.googleLocationId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.metrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>
                      {new Date(metric.metricDate).toLocaleDateString("en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {metric.metricName}
                    </TableCell>
                    <TableCell>{metric.metricValue}</TableCell>
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
