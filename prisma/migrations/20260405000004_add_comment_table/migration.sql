-- Migration: add_comment_table
-- Adds the Comment table for per-project (optionally per-audit-run / per-finding)
-- user comments.  Writes are gated by RLS: owner and members may INSERT/DELETE
-- their own rows; all project members may SELECT.

CREATE TABLE "Comment" (
  "id"         TEXT         NOT NULL,
  "projectId"  TEXT         NOT NULL,
  "authorId"   TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "auditRunId" TEXT,
  "findingKey" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_projectId_idx"  ON "Comment"("projectId");
CREATE INDEX "Comment_auditRunId_idx" ON "Comment"("auditRunId");

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_auditRunId_fkey"
  FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."Comment" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON "public"."Comment" TO authenticated;

-- Owner: full access to comments on their projects
CREATE POLICY "comment_select_owner"
  ON "public"."Comment"
  FOR SELECT TO authenticated
  USING (
    "projectId" IN (
      SELECT "id" FROM "public"."Project" WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "comment_insert_owner"
  ON "public"."Comment"
  FOR INSERT TO authenticated
  WITH CHECK (
    "projectId" IN (
      SELECT "id" FROM "public"."Project" WHERE "userId" = auth.uid()::text
    )
    AND "authorId" = auth.uid()::text
  );

CREATE POLICY "comment_delete_owner"
  ON "public"."Comment"
  FOR DELETE TO authenticated
  USING (
    "projectId" IN (
      SELECT "id" FROM "public"."Project" WHERE "userId" = auth.uid()::text
    )
  );

-- Member: read all comments; insert/delete own rows only
CREATE POLICY "comment_select_member"
  ON "public"."Comment"
  FOR SELECT TO authenticated
  USING (
    "projectId" IN (
      SELECT "projectId" FROM "public"."ProjectMember"
      WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "comment_insert_member"
  ON "public"."Comment"
  FOR INSERT TO authenticated
  WITH CHECK (
    "projectId" IN (
      SELECT "projectId" FROM "public"."ProjectMember"
      WHERE "userId" = auth.uid()::text
    )
    AND "authorId" = auth.uid()::text
  );

CREATE POLICY "comment_delete_own"
  ON "public"."Comment"
  FOR DELETE TO authenticated
  USING ("authorId" = auth.uid()::text);
