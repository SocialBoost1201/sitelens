// /invite/[token] — Accept or decline a project invitation

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AcceptInviteForm } from "./accept-form"
import Link from "next/link"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from("ProjectInvite")
    .select("id, email, role, status, expiresAt, projectId")
    .eq("token", token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>This invitation link is invalid or has already been used.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expired = new Date(invite.expiresAt) < new Date()
  if (invite.status !== "PENDING" || expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {invite.status === "ACCEPTED"
                ? "Invite Already Accepted"
                : expired
                ? "Invite Expired"
                : "Invite Declined"}
            </CardTitle>
            <CardDescription>
              {invite.status === "ACCEPTED"
                ? "This invitation has already been accepted."
                : expired
                ? "This invitation has expired. Please ask the project owner to send a new invite."
                : "This invitation was declined."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get project info
  const { data: project } = await admin.from("Project").select("name, url").eq("id", invite.projectId).single()

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to sign-in with return URL
    redirect(`/sign-in?next=/invite/${token}`)
  }

  // Check user email matches invite
  const emailMatches = user.email?.toLowerCase() === invite.email.toLowerCase()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Project Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{project?.name ?? "a project"}</strong> as a{" "}
            <strong>{invite.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{project.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{project.url}</p>
            </div>
          )}
          {!emailMatches && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              This invitation was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
              <strong>{user.email}</strong>. You can still accept, but make sure this is intended.
            </p>
          )}
          <AcceptInviteForm token={token} projectId={invite.projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
