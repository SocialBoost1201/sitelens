-- ─── Migration: violation_member_models ──────────────────────────────────────
-- Adds AlertViolation + ProjectMember tables (Doc-03 Gap 7 + Gap 8)
-- and extends RLS to cover the member-path access model (Doc-06 §3.4).
-- Applied to Supabase (adwwdxwdeeknepulfegs) via MCP on 2026-04-05.
-- Design docs: Doc-03, Doc-06

-- ─── New Enum ─────────────────────────────────────────────────────────────────

CREATE TYPE "ProjectRole" AS ENUM ('ANALYST', 'VIEWER');

-- ─── AlertViolation ───────────────────────────────────────────────────────────
-- Snapshot violation record per AuditRun + AlertRule combination.
-- All value fields snapshot rule state at violation time (immutable history).
-- Written by audit pipeline (service role) only. authenticated = SELECT only.

CREATE TABLE "AlertViolation" (
    "id"          TEXT             NOT NULL,
    "auditRunId"  TEXT             NOT NULL,
    "alertRuleId" TEXT             NOT NULL,
    "metricKey"   TEXT             NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "threshold"   DOUBLE PRECISION NOT NULL,
    "operator"    "AlertOperator"  NOT NULL,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertViolation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertViolation_auditRunId_idx"  ON "AlertViolation"("auditRunId");
CREATE INDEX "AlertViolation_alertRuleId_idx" ON "AlertViolation"("alertRuleId");

ALTER TABLE "AlertViolation"
  ADD CONSTRAINT "AlertViolation_auditRunId_fkey"
  FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertViolation"
  ADD CONSTRAINT "AlertViolation_alertRuleId_fkey"
  FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ProjectMember ────────────────────────────────────────────────────────────
-- Invitation-based project access for Analyst and Viewer roles.
-- Project owner (Project.userId) is NOT in this table.
-- @@unique([projectId, userId]) enforces one role per user per project.

CREATE TABLE "ProjectMember" (
    "id"        TEXT          NOT NULL,
    "projectId" TEXT          NOT NULL,
    "userId"    TEXT          NOT NULL,
    "role"      "ProjectRole" NOT NULL,
    "invitedBy" TEXT          NOT NULL,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
CREATE INDEX        "ProjectMember_userId_idx"           ON "ProjectMember"("userId");

ALTER TABLE "ProjectMember"
  ADD CONSTRAINT "ProjectMember_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Enable RLS on new tables ─────────────────────────────────────────────────

ALTER TABLE "public"."AlertViolation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectMember"  ENABLE ROW LEVEL SECURITY;

-- ─── GRANTs ───────────────────────────────────────────────────────────────────

GRANT SELECT               ON "public"."AlertViolation" TO authenticated;
GRANT SELECT, INSERT, DELETE ON "public"."ProjectMember"  TO authenticated;

-- ─── AlertViolation: owner path (via AuditRun → Project) ──────────────────────

CREATE POLICY "alertviolation_select_own_project"
  ON "public"."AlertViolation"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."Project" ON "Project"."id" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "AlertViolation"."auditRunId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

-- ─── AlertViolation: member path ─────────────────────────────────────────────

CREATE POLICY "alertviolation_select_member"
  ON "public"."AlertViolation"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."ProjectMember"
        ON "ProjectMember"."projectId" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "AlertViolation"."auditRunId"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── Project: member path ─────────────────────────────────────────────────────

CREATE POLICY "project_select_member"
  ON "public"."Project"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."ProjectMember"
      WHERE "ProjectMember"."projectId" = "Project"."id"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── AuditRun: member path ────────────────────────────────────────────────────

CREATE POLICY "auditrun_select_member"
  ON "public"."AuditRun"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."ProjectMember"
      WHERE "ProjectMember"."projectId" = "AuditRun"."projectId"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── Metric: member path ──────────────────────────────────────────────────────

CREATE POLICY "metric_select_member"
  ON "public"."Metric"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."ProjectMember"
        ON "ProjectMember"."projectId" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "Metric"."auditRunId"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── Finding: member path ─────────────────────────────────────────────────────

CREATE POLICY "finding_select_member"
  ON "public"."Finding"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."ProjectMember"
        ON "ProjectMember"."projectId" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "Finding"."auditRunId"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── AlertRule: member path (read-only at MVP) ────────────────────────────────

CREATE POLICY "alertrule_select_member"
  ON "public"."AlertRule"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."ProjectMember"
      WHERE "ProjectMember"."projectId" = "AlertRule"."projectId"
        AND "ProjectMember"."userId" = auth.uid()::text
    )
  );

-- ─── ProjectMember policies ───────────────────────────────────────────────────

-- Member can read their own membership rows
CREATE POLICY "projectmember_select_own"
  ON "public"."ProjectMember"
  FOR SELECT TO authenticated
  USING (auth.uid()::text = "userId");

-- Project owner can add members to their projects
CREATE POLICY "projectmember_insert_own_project"
  ON "public"."ProjectMember"
  FOR INSERT TO authenticated
  WITH CHECK (
    "projectId" IN (
      SELECT "id" FROM "public"."Project"
      WHERE "userId" = auth.uid()::text
    )
  );

-- Project owner can remove members from their projects
CREATE POLICY "projectmember_delete_own_project"
  ON "public"."ProjectMember"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "ProjectMember"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );
