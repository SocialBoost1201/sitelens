-- ─── RLS Policies: SiteLens MVP ──────────────────────────────────────────────
-- Migration: 20260404000001_rls_policies
-- Applied to: adwwdxwdeeknepulfegs (ap-northeast-1)
-- Design doc: docs/06_security/Doc-06_SecurityDesign_v0.1.md
--
-- Ownership model:
--   Project.userId  = auth.uid()::text  (direct ownership)
--   AuditRun        = owned via Project (1-level JOIN)
--   Metric          = owned via AuditRun → Project (2-level JOIN)
--   Finding         = owned via AuditRun → Project (2-level JOIN)
--   AlertRule       = owned via Project (1-level JOIN)
--
-- Notes:
--   - auth.uid() returns UUID; Project.userId is TEXT → cast required
--   - AuditRun UPDATE intentionally omitted (status transitions are system-only via service role)
--   - Metric/Finding INSERT intentionally omitted (written by audit pipeline via service role)
--   - Service role bypasses RLS by default (Supabase standard)
--   - Prisma pg adapter also bypasses RLS (uses postgres role directly)
--     → server-side data access is safe; RLS protects Supabase client (anon/authenticated) only

-- ─── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE "public"."Project"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditRun"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Metric"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Finding"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AlertRule" ENABLE ROW LEVEL SECURITY;

-- ─── GRANTs to authenticated role ────────────────────────────────────────────
-- Tables created by Prisma DDL do not automatically have grants for authenticated.
-- These grants are required for Supabase client reads/writes to work at all.

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."Project"   TO authenticated;
GRANT SELECT, INSERT,          DELETE ON "public"."AuditRun"  TO authenticated;
GRANT SELECT                          ON "public"."Metric"    TO authenticated;
GRANT SELECT                          ON "public"."Finding"   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."AlertRule"  TO authenticated;

-- ─── Project policies (direct ownership via userId) ───────────────────────────

CREATE POLICY "project_select_own"
  ON "public"."Project"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "userId");

CREATE POLICY "project_insert_own"
  ON "public"."Project"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "project_update_own"
  ON "public"."Project"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "project_delete_own"
  ON "public"."Project"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = "userId");

-- ─── AuditRun policies (ownership via Project; no UPDATE — system-only) ──────

CREATE POLICY "auditrun_select_own_project"
  ON "public"."AuditRun"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "AuditRun"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "auditrun_insert_own_project"
  ON "public"."AuditRun"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "projectId" IN (
      SELECT "id" FROM "public"."Project"
      WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "auditrun_delete_own_project"
  ON "public"."AuditRun"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "AuditRun"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

-- ─── Metric policies (SELECT only; writes are system-only via service role) ───

CREATE POLICY "metric_select_own_project"
  ON "public"."Metric"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."Project" ON "Project"."id" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "Metric"."auditRunId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

-- ─── Finding policies (SELECT only; writes are system-only via service role) ──

CREATE POLICY "finding_select_own_project"
  ON "public"."Finding"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."AuditRun"
      JOIN "public"."Project" ON "Project"."id" = "AuditRun"."projectId"
      WHERE "AuditRun"."id" = "Finding"."auditRunId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

-- ─── AlertRule policies (full CRUD via Project ownership) ─────────────────────

CREATE POLICY "alertrule_select_own_project"
  ON "public"."AlertRule"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "AlertRule"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "alertrule_insert_own_project"
  ON "public"."AlertRule"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "projectId" IN (
      SELECT "id" FROM "public"."Project"
      WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "alertrule_update_own_project"
  ON "public"."AlertRule"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "AlertRule"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "projectId" IN (
      SELECT "id" FROM "public"."Project"
      WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "alertrule_delete_own_project"
  ON "public"."AlertRule"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "AlertRule"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );
