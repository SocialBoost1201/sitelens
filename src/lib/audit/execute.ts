// Audit pipeline orchestrator — SiteLens
//
// Executes a full PSI audit for one project URL and persists all results.
// Called by the audit trigger Route Handler after an AuditRun record is
// created in PENDING state.
//
// Pipeline steps:
//   1. Mark AuditRun as RUNNING (startedAt timestamp)
//   2. Call PSI API
//   3. Normalize metrics
//   4. Extract findings
//   5. Fetch project's AlertRules
//   6. Evaluate thresholds → violations
//   7. Write Metrics, Findings, AlertViolations in parallel
//   8. Mark AuditRun as COMPLETED (finishedAt timestamp)
//
// On any error:
//   - Mark AuditRun as FAILED with errorMessage
//   - Re-throw so the caller can surface the error
//
// Data access: Supabase admin client (service role) — bypasses RLS.
// All pipeline writes are system-initiated, not user-initiated.
//
// Requirements: SUPABASE_SERVICE_ROLE_KEY must be set (throws if missing).

import { createAdminClient } from "@/lib/supabase/admin";
import { runPageSpeedAudit } from "@/lib/services/pagespeed";
import { normalizePageSpeedMetrics } from "./normalize/pagespeed";
import { extractPageSpeedFindings } from "./findings/pagespeed";
import { evaluateThresholds, type AlertRuleRow } from "./thresholds";
import { fireEvent } from "@/lib/services/notifier";
import type { NotificationChannelType } from "@/lib/services/notifier";

// ─── execute ──────────────────────────────────────────────────────────────────

/**
 * Run the full audit pipeline for a project.
 *
 * @param projectId  The project's DB ID
 * @param auditRunId The AuditRun record (must exist, status PENDING)
 * @param url        The URL to audit
 */
export async function execute(
  projectId: string,
  auditRunId: string,
  url: string,
): Promise<void> {
  const admin = createAdminClient();

  // Step 1: Mark RUNNING
  const startedAt = new Date().toISOString();
  await admin
    .from("AuditRun")
    .update({ status: "RUNNING", startedAt })
    .eq("id", auditRunId);

  try {
    // Step 2: Call PSI API (MOBILE strategy for MVP — matches Google's primary index)
    const psiResponse = await runPageSpeedAudit(url, "MOBILE");
    const lhr = psiResponse.lighthouseResult;

    // Step 3: Normalize metrics
    const metrics = normalizePageSpeedMetrics(lhr);

    // Step 4: Extract findings
    const findings = extractPageSpeedFindings(lhr);

    // Step 5: Fetch AlertRules for this project
    const { data: rules } = await admin
      .from("AlertRule")
      .select("id, metric, operator, threshold, enabled")
      .eq("projectId", projectId);

    // Step 6: Evaluate thresholds
    const violationPayloads = evaluateThresholds(
      (rules ?? []) as AlertRuleRow[],
      metrics,
    );

    // Step 7: Write all results to DB in parallel
    const now = new Date().toISOString();

    const metricRows = metrics.map((m) => ({
      id: crypto.randomUUID(),
      auditRunId,
      key: m.key,
      value: m.value,
      unit: m.unit,
      source: m.source,
      createdAt: now,
    }));

    const findingRows = findings.map((f) => ({
      id: crypto.randomUUID(),
      auditRunId,
      key: f.key,
      title: f.title,
      severity: f.severity,
      category: f.category,
      source: f.source,
      status: f.status,
      displayValue: f.displayValue,
      createdAt: now,
    }));

    const violationRows = violationPayloads.map((v) => ({
      id: crypto.randomUUID(),
      auditRunId,
      alertRuleId: v.alertRuleId,
      metricKey: v.metricKey,
      actualValue: v.actualValue,
      threshold: v.threshold,
      operator: v.operator,
      createdAt: now,
    }));

    // Write results — awaited individually to avoid PostgrestFilterBuilder
    // assignability issues with Promise.all (builders are thenables but not
    // full Promise instances).
    if (metricRows.length > 0) {
      await admin.from("Metric").insert(metricRows);
    }
    if (findingRows.length > 0) {
      await admin.from("Finding").insert(findingRows);
    }
    if (violationRows.length > 0) {
      await admin.from("AlertViolation").insert(violationRows);
    }

    // Also store the raw PSI response on the AuditRun row
    await admin
      .from("AuditRun")
      .update({ rawData: psiResponse as unknown as import("@/lib/supabase/database.types").Json })
      .eq("id", auditRunId);

    // Step 8: Mark COMPLETED
    const finishedAt = new Date().toISOString();
    await admin
      .from("AuditRun")
      .update({ status: "COMPLETED", finishedAt })
      .eq("id", auditRunId);

    // Step 9: Fire AUDIT_COMPLETE notifications (best-effort, non-blocking)
    void notifyAuditComplete(admin, projectId, url, metrics).catch(() => {})
  } catch (err) {
    // On any failure: mark FAILED with error message
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error during audit.";

    await admin
      .from("AuditRun")
      .update({
        status: "FAILED",
        errorMessage,
        finishedAt: new Date().toISOString(),
      })
      .eq("id", auditRunId);

    // Fire AUDIT_FAILED notifications (best-effort)
    void notifyAuditFailed(admin, projectId, url, errorMessage).catch(() => {})

    throw err; // Re-throw so the Route Handler can return an error response
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────

async function getEnabledChannels(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
) {
  const { data } = await admin
    .from("NotificationChannel")
    .select("type, name, url")
    .eq("projectId", projectId)
    .eq("enabled", true)
  return (data ?? []).map(c => ({ ...c, type: c.type as NotificationChannelType }))
}

async function notifyAuditComplete(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  url: string,
  metrics: { key: string; value: number }[],
) {
  const channels = await getEnabledChannels(admin, projectId)
  if (channels.length === 0) return

  const { data: project } = await admin
    .from("Project").select("name").eq("id", projectId).single()

  const perfScore = metrics.find(m => m.key === "performance")?.value
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"

  await fireEvent(channels, {
    event: "AUDIT_COMPLETE",
    projectName: project?.name ?? projectId,
    projectUrl: url,
    dashboardUrl: `${appUrl}/dashboard/${projectId}`,
    score: perfScore !== undefined ? Math.round(perfScore) : undefined,
  })
}

async function notifyAuditFailed(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  url: string,
  errorMessage: string,
) {
  const channels = await getEnabledChannels(admin, projectId)
  if (channels.length === 0) return

  const { data: project } = await admin
    .from("Project").select("name").eq("id", projectId).single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sitelens.app"

  await fireEvent(channels, {
    event: "AUDIT_FAILED",
    projectName: project?.name ?? projectId,
    projectUrl: url,
    dashboardUrl: `${appUrl}/dashboard/${projectId}`,
    errorMessage,
  })
}
