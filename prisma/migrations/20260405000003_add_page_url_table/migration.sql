-- Migration: add_page_url_table
-- Adds PageUrl table for sitemap crawler results.

CREATE TABLE "PageUrl" (
  "id"             TEXT NOT NULL,
  "projectId"      TEXT NOT NULL,
  "url"            TEXT NOT NULL,
  "discoveredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAuditedAt"  TIMESTAMP(3),
  "lastAuditRunId" TEXT,
  CONSTRAINT "PageUrl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageUrl_projectId_url_key" ON "PageUrl"("projectId", "url");
CREATE INDEX "PageUrl_projectId_idx" ON "PageUrl"("projectId");

ALTER TABLE "PageUrl"
  ADD CONSTRAINT "PageUrl_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageUrl"
  ADD CONSTRAINT "PageUrl_lastAuditRunId_fkey"
  FOREIGN KEY ("lastAuditRunId") REFERENCES "AuditRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PageUrl" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_page_url" ON "PageUrl"
  FOR SELECT USING (
    "projectId" IN (SELECT id FROM "Project" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "owner_insert_page_url" ON "PageUrl"
  FOR INSERT WITH CHECK (
    "projectId" IN (SELECT id FROM "Project" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "owner_update_page_url" ON "PageUrl"
  FOR UPDATE USING (
    "projectId" IN (SELECT id FROM "Project" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "owner_delete_page_url" ON "PageUrl"
  FOR DELETE USING (
    "projectId" IN (SELECT id FROM "Project" WHERE "userId" = auth.uid()::text)
  );

CREATE POLICY "member_select_page_url" ON "PageUrl"
  FOR SELECT USING (
    "projectId" IN (
      SELECT "projectId" FROM "ProjectMember" WHERE "userId" = auth.uid()::text
    )
  );
