// POST /api/webhooks/vercel
// Receives Vercel deploy webhook events.
// When a production deployment succeeds, triggers an audit on the linked project.
//
// Setup in Vercel:
//   1. Project → Settings → Git → Deploy Hooks (or Webhooks)
//   2. Payload URL: https://your-domain/api/webhooks/vercel
//   3. Set VERCEL_WEBHOOK_SECRET in env (Vercel signs with HMAC-SHA1)

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const WEBHOOK_SECRET = process.env.VERCEL_WEBHOOK_SECRET ?? ""

function verifyVercelSignature(body: string, signature: string | null): boolean {
  if (!signature || !WEBHOOK_SECRET) return !WEBHOOK_SECRET
  const expected = createHmac("sha1", WEBHOOK_SECRET).update(body).digest("hex")
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  void fetch(`${appUrl}/api/audits/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditRunId: id, url }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("x-vercel-signature")

  if (!verifyVercelSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(body) } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Vercel webhook payload shape:
  // { type: "deployment.succeeded", payload: { deployment: { url, meta: { githubRepo } } } }
  const type = payload.type as string
  if (type !== "deployment.succeeded") {
    return NextResponse.json({ skipped: true, type })
  }

  const deployment = (payload.payload as { deployment?: { url?: string; target?: string } } | undefined)?.deployment
  if (!deployment) return NextResponse.json({ skipped: true, reason: "no deployment" })

  // Only trigger on production deployments
  if (deployment.target && deployment.target !== "production") {
    return NextResponse.json({ skipped: true, reason: "not production" })
  }

  const deployUrl = deployment.url ? `https://${deployment.url}` : null
  if (!deployUrl) return NextResponse.json({ skipped: true, reason: "no deployment url" })

  // Match by VERCEL_PROJECT_ID env var stored in project metadata or URL match
  const admin = createAdminClient()
  const { data: projects } = await admin
    .from("Project")
    .select("id, url")
    .ilike("url", `%${new URL(deployUrl).hostname.split(".")[0]}%`)
    .limit(1)

  const project = projects?.[0]
  if (!project) return NextResponse.json({ skipped: true, reason: "project not matched" })

  await triggerAudit(project.id, deployUrl)
  return NextResponse.json({ triggered: true, projectId: project.id, url: deployUrl })
}
