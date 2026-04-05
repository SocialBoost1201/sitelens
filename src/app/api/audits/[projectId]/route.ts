// Audit trigger Route Handler — POST /api/audits/[projectId]
//
// Triggers a PSI audit run for the given project.
// The pipeline runs synchronously within this Route Handler — the response
// is returned only after the run completes (or fails).
//
// This approach is simple and correct for MVP. If timeouts become an issue
// (PSI typically takes 10–30 s), increase the Vercel function maxDuration
// in vercel.json and use `after()` for background execution.
//
// Authentication: requires a valid session (checked via getUser()).
// Authorization: the project must be owned by the authenticated user (RLS).
//
// Requirements before this endpoint works:
//   - PAGESPEED_API_KEY set in .env.local
//   - SUPABASE_SERVICE_ROLE_KEY set in .env.local

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execute } from "@/lib/audit/execute";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  // ── Auth check ───────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch project (RLS enforces ownership) ───────────────────────────────
  const { data: project, error: projectError } = await supabase
    .from("Project")
    .select("id, url, userId")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found or access denied." },
      { status: 404 },
    );
  }

  // ── Create AuditRun record (PENDING) ─────────────────────────────────────
  const now = new Date().toISOString();
  const auditRunId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("AuditRun").insert({
    id: auditRunId,
    projectId,
    status: "PENDING",
    createdAt: now,
  });

  if (insertError) {
    console.error("[audits/route] Failed to create AuditRun:", insertError);
    return NextResponse.json(
      { error: "Failed to create audit run. Please try again." },
      { status: 500 },
    );
  }

  // ── Run the pipeline ─────────────────────────────────────────────────────
  try {
    await execute(projectId, auditRunId, project.url);

    return NextResponse.json(
      { auditRunId, status: "COMPLETED" },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed.";
    console.error("[audits/route] Pipeline error:", message);

    return NextResponse.json(
      { auditRunId, status: "FAILED", error: message },
      { status: 500 },
    );
  }
}
