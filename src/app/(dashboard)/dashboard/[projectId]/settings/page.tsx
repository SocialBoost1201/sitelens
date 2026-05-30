// Project Settings page — /dashboard/[projectId]/settings

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationChannelsClient } from "./notification-channels-client"
import { ShareLinksClient } from "./share-links-client"
import { MembersClient } from "./members-client"

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("Project").select("name").eq("id", projectId).single()
  return { title: data ? `${data.name} — Settings — SiteLens` : "Settings — SiteLens" }
}

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: project, error } = await supabase
    .from("Project").select("id, name, url").eq("id", projectId).single()
  if (error || !project) notFound()

  const { data: channels } = await supabase
    .from("NotificationChannel")
    .select("id, type, name, url, enabled, lastTestedAt")
    .eq("projectId", projectId)
    .order("createdAt")

  const { data: shares } = await supabase
    .from("PublicShare")
    .select("id, slug, createdAt, expiresAt, enabled")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"
  const shareLinks = (shares ?? []).map(s => ({
    ...s,
    url: `${appUrl}/share/${s.slug}`,
  }))

  const admin = createAdminClient()
  const { data: memberRows } = await admin
    .from("ProjectMember")
    .select("id, userId, role, createdAt")
    .eq("projectId", projectId)
    .order("createdAt")

  const enrichedMembers = await Promise.all((memberRows ?? []).map(async (m) => {
    const { data: ud } = await admin.auth.admin.getUserById(m.userId)
    return { ...m, email: ud?.user?.email ?? null }
  }))

  const { data: invites } = await admin
    .from("ProjectInvite")
    .select("id, email, role, status, createdAt, expiresAt")
    .eq("projectId", projectId)
    .eq("status", "PENDING")
    .order("createdAt", { ascending: false })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Settings</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="size-6" />
          Project Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.url}</p>
      </div>

      {/* Project info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project</CardTitle>
          <CardDescription>Basic project information</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Name</dt>
              <dd className="font-medium">{project.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">URL</dt>
              <dd>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline break-all"
                >
                  {project.url}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Project ID</dt>
              <dd className="font-mono text-muted-foreground text-xs">{project.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Public share links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Share Links</CardTitle>
          <CardDescription>
            Share a read-only audit report with clients or teammates — no login required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShareLinksClient projectId={projectId} initialShares={shareLinks} />
        </CardContent>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Invite colleagues to view or analyze this project. Members can access audit reports and findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersClient
            projectId={projectId}
            initialMembers={enrichedMembers as Parameters<typeof MembersClient>[0]["initialMembers"]}
            initialInvites={(invites ?? []) as Parameters<typeof MembersClient>[0]["initialInvites"]}
          />
        </CardContent>
      </Card>

      {/* Notification channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
          <CardDescription>
            Receive Slack or Discord alerts when audits complete, scores drop, or broken links are found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationChannelsClient
            projectId={projectId}
            initialChannels={(channels ?? []) as Parameters<typeof NotificationChannelsClient>[0]["initialChannels"]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
