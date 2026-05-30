// Cron audit trigger — SiteLens
//
// Called daily by Vercel Cron Jobs to run scheduled audits for all projects.
// Each project gets one AuditRun created (PENDING) then executed in sequence.
// Individual failures are isolated — one failure does not abort the batch.
//
// Schedule: defined in vercel.json ("0 3 * * *" = daily at 03:00 UTC)
//
// Security: requires Authorization: Bearer <CRON_SECRET> header.
// On Vercel this header is injected automatically by the Cron runtime.
// For manual triggers, pass the header explicitly.
//
// Data access: Supabase admin client (service role) — RLS bypass.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { execute } from "@/lib/audit/execute";
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url";

// ─── POST — run scheduled audits ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate shared secret
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Fetch all projects
  const { data: projects, error: projectsError } = await admin
    .from("Project")
    .select("id, url, name");

  if (projectsError) {
    return NextResponse.json(
      { error: "Failed to fetch projects", detail: projectsError.message },
      { status: 500 },
    );
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ ok: true, total: 0, message: "No projects to audit." });
  }

  // 2. For each project: create AuditRun (PENDING) then execute pipeline
  const results: Array<{ projectId: string; status: "ok" | "error"; error?: string }> = [];

  for (const project of projects) {
    let auditUrl: string;
    try {
      auditUrl = await assertSafeExternalHttpUrl(project.url);
    } catch (err) {
      results.push({
        projectId: project.id,
        status: "error",
        error: isUnsafeExternalUrlError(err) ? err.message : "Invalid project URL",
      });
      continue;
    }

    const auditRunId = crypto.randomUUID();

    // Create AuditRun row (PENDING)
    const { error: insertError } = await admin.from("AuditRun").insert({
      id: auditRunId,
      projectId: project.id,
      status: "PENDING",
      createdAt: now,
    });

    if (insertError) {
      results.push({ projectId: project.id, status: "error", error: insertError.message });
      continue;
    }

    // Execute audit pipeline (marks RUNNING → COMPLETED or FAILED internally)
    try {
      await execute(project.id, auditRunId, auditUrl);
      results.push({ projectId: project.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ projectId: project.id, status: "error", error: message });
      // Continue to next project — failures are isolated
    }
  }

  const succeeded = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    ok: true,
    total: projects.length,
    succeeded,
    failed,
    results,
  });
}

// ─── GET — health check ───────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: true, endpoint: "/api/cron/audit", status: "active" },
    { status: 200 },
  );
}
