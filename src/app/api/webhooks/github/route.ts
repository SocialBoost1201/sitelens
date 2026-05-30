// POST /api/webhooks/github
// Receives GitHub webhook events (push, deployment_status, workflow_run).
// When a deployment succeeds, triggers an audit on the associated project.
//
// Setup:
//   1. Generate a secret: openssl rand -hex 32
//   2. Set GITHUB_WEBHOOK_SECRET in env
//   3. In GitHub repo → Settings → Webhooks → Add webhook
//      Payload URL: https://your-domain/api/webhooks/github
//      Content type: application/json
//      Secret: <your secret>
//      Events: Deployments, Workflow runs (or just push)

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? ""
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ""

/**
 * Posts a commit comment on GitHub. Fire-and-forget — errors are silently ignored.
 * Skipped entirely when GITHUB_TOKEN is not configured.
 */
function postGitHubCommitComment(repoFullName: string, sha: string, body: string): void {
  if (!GITHUB_TOKEN || !repoFullName || !sha) return
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) return
  void fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  }).catch(() => {})
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !WEBHOOK_SECRET) return !WEBHOOK_SECRET  // skip if no secret configured
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function triggerAudit(projectId: string, url: string): Promise<void> {
  const admin = createAdminClient()
  const id = crypto.randomUUID()

  await admin.from("AuditRun").insert({
    id,
    projectId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  })

  // Fire-and-forget: call own audit API
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  void fetch(`${appUrl}/api/audits/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditRunId: id, url }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("x-hub-signature-256")
  const event = req.headers.get("x-github-event") ?? ""

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(body) } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // We only act on deployment_status success or workflow_run completed/success
  const skip =
    (event === "deployment_status" && (payload as { deployment_status?: { state?: string } }).deployment_status?.state !== "success") ||
    (event === "workflow_run" && (payload as { workflow_run?: { conclusion?: string; status?: string } }).workflow_run?.conclusion !== "success") ||
    (event === "push" && (payload as { ref?: string }).ref !== "refs/heads/main" && (payload as { ref?: string }).ref !== "refs/heads/master")

  if (skip && event !== "push") {
    return NextResponse.json({ skipped: true, event })
  }

  // Resolve repo URL → project
  const repoHtmlUrl = (payload as { repository?: { html_url?: string } }).repository?.html_url ?? ""
  if (!repoHtmlUrl) return NextResponse.json({ skipped: true, reason: "no repo url" })

  const admin = createAdminClient()

  // Match project by stored metadata or by tag convention (sitelens-projectId in topics)
  // Simple approach: look for project whose URL is tagged in repo topics
  const topics: string[] = (payload as { repository?: { topics?: string[] } }).repository?.topics ?? []
  const projectTag = topics.find(t => t.startsWith("sitelens-"))
  const projectId = projectTag?.replace("sitelens-", "")

  if (!projectId) {
    return NextResponse.json({ skipped: true, reason: "no sitelens-<projectId> topic found on repo" })
  }

  const { data: project } = await admin
    .from("Project").select("id, url").eq("id", projectId).single()

  if (!project) return NextResponse.json({ skipped: true, reason: "project not found" })

  await triggerAudit(project.id, project.url)

  // Post a commit comment back to GitHub (fire-and-forget, skipped if no token)
  const repoFullName = (payload as { repository?: { full_name?: string } }).repository?.full_name ?? ""
  let commitSha = ""
  if (event === "push") {
    commitSha = (payload as { after?: string }).after ?? ""
  } else if (event === "deployment_status") {
    commitSha = (payload as { deployment?: { sha?: string } }).deployment?.sha ?? ""
  } else if (event === "workflow_run") {
    commitSha = (payload as { workflow_run?: { head_sha?: string } }).workflow_run?.head_sha ?? ""
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const commentBody =
    `🔍 **SiteLens audit triggered** — Results will appear in your [SiteLens dashboard](${appUrl}/dashboard/${project.id}) once the audit completes.`
  postGitHubCommitComment(repoFullName, commitSha, commentBody)

  return NextResponse.json({ triggered: true, projectId: project.id })
}
