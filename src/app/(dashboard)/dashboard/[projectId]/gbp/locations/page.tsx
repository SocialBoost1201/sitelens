import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Building2 } from "lucide-react"
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

function getStatusMessage(status?: string) {
  switch (status) {
    case "gbp_connected":
      return "Google Business Profile connected successfully."
    case "gbp_sync_failed":
      return "Google connection succeeded, but fetching locations failed."
    case "gbp_auth_required":
      return "Please sign in again before connecting Google Business Profile."
    case "gbp_forbidden":
      return "Only the project owner can manage Google Business Profile."
    default:
      return null
  }
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
    title: project ? `${project.name} — Local SEO Locations — SiteLens` : "Local SEO Locations — SiteLens",
  }
}

export default async function GbpLocationsPage({
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
    select: { id: true, name: true, url: true, userId: true },
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

  const statusValue = resolvedSearchParams.status
  const status =
    typeof statusValue === "string" ? getStatusMessage(statusValue) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Local SEO Locations</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="size-6" />
            Local SEO Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Google Business Profile and manage locations used by the Local SEO module.
          </p>
        </div>
        <Button asChild>
          <Link href={`/api/integrations/google/business-profile/connect?projectId=${projectId}`}>
            {integration ? "Reconnect Google" : "Connect Google"}
          </Link>
        </Button>
      </div>

      {status && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{status}</p>
          </CardContent>
        </Card>
      )}

      {!integration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Google connection yet</CardTitle>
            <CardDescription>
              Connect Google Business Profile to fetch and store your locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/api/integrations/google/business-profile/connect?projectId=${projectId}`}>
                Connect Google Business Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {integration && locations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No locations found</CardTitle>
            <CardDescription>
              Your Google Business Profile connection is active, but no locations were returned.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Locations</CardTitle>
            <CardDescription>
              Locations synced from Google Business Profile and stored server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>{location.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {location.googleLocationId}
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
