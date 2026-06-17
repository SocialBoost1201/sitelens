-- ─── Keyword & Rank Tracking (Doc-11 / BL-01) ─────────────────────────────────
-- Migration: 20260617000011_add_keyword_rank_tracking
-- Adds the new keyword-rank-tracking axis: a config entity (TrackedKeyword) plus a
-- time-series history table (KeywordRankSnapshot), mirroring UptimeMonitor/UptimeEvent.
--
-- Access model (identical to GeoResult / UptimeMonitor — owner-based, single workspace):
--   * Writes happen through the service-role (admin) client in the keyword API/cron
--     routes, which bypass RLS by design.
--   * authenticated users may SELECT rows for projects they own.
--   * anon may SELECT rows reachable through an active PublicShare (read-only /share).
--
-- No rank "score" column: keyword rankings are NOT a scored axis at MVP (approval-gated).

-- ── Enum ───────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."RankDevice" AS ENUM ('DESKTOP', 'MOBILE');

-- ── TrackedKeyword (config entity) ──────────────────────────────────────────────

CREATE TABLE "public"."TrackedKeyword" (
  "id"            TEXT NOT NULL,
  "projectId"     TEXT NOT NULL,
  "keyword"       TEXT NOT NULL,
  "targetUrl"     TEXT NOT NULL,
  "country"       TEXT NOT NULL DEFAULT 'us',
  "language"      TEXT NOT NULL DEFAULT 'en',
  "device"        "public"."RankDevice" NOT NULL DEFAULT 'DESKTOP',
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "lastCheckedAt" TIMESTAMP(3),
  "lastPosition"  INTEGER,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrackedKeyword_projectId_idx" ON "public"."TrackedKeyword" ("projectId");
CREATE UNIQUE INDEX "TrackedKeyword_project_keyword_key"
  ON "public"."TrackedKeyword" ("projectId", "keyword", "country", "language", "device");

ALTER TABLE "public"."TrackedKeyword"
  ADD CONSTRAINT "TrackedKeyword_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "public"."Project" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── KeywordRankSnapshot (history) ───────────────────────────────────────────────

CREATE TABLE "public"."KeywordRankSnapshot" (
  "id"           TEXT NOT NULL,
  "keywordId"    TEXT NOT NULL,
  "position"     INTEGER,
  "rankedUrl"    TEXT,
  "serpFeatures" JSONB NOT NULL DEFAULT '{}',
  "source"       TEXT NOT NULL,
  "capturedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KeywordRankSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KeywordRankSnapshot_keywordId_idx" ON "public"."KeywordRankSnapshot" ("keywordId");
CREATE INDEX "KeywordRankSnapshot_keywordId_capturedAt_idx"
  ON "public"."KeywordRankSnapshot" ("keywordId", "capturedAt");

ALTER TABLE "public"."KeywordRankSnapshot"
  ADD CONSTRAINT "KeywordRankSnapshot_keywordId_fkey"
  FOREIGN KEY ("keywordId") REFERENCES "public"."TrackedKeyword" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RLS + grants: TrackedKeyword ─────────────────────────────────────────────────

ALTER TABLE "public"."TrackedKeyword" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON "public"."TrackedKeyword" TO authenticated;
GRANT SELECT ON "public"."TrackedKeyword" TO anon;

CREATE POLICY "trackedkeyword_select_own_project"
  ON "public"."TrackedKeyword"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."Project"
      WHERE "Project"."id" = "TrackedKeyword"."projectId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "trackedkeyword_select_anon_via_active_share"
  ON "public"."TrackedKeyword"
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM "public"."PublicShare"
      WHERE "PublicShare"."projectId" = "TrackedKeyword"."projectId"
        AND "PublicShare"."enabled" = true
        AND ("PublicShare"."expiresAt" IS NULL OR "PublicShare"."expiresAt" > now())
    )
  );

-- ── RLS + grants: KeywordRankSnapshot (ownership via keyword → project) ───────────

ALTER TABLE "public"."KeywordRankSnapshot" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON "public"."KeywordRankSnapshot" TO authenticated;
GRANT SELECT ON "public"."KeywordRankSnapshot" TO anon;

CREATE POLICY "keywordranksnapshot_select_own_project"
  ON "public"."KeywordRankSnapshot"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."TrackedKeyword"
      JOIN "public"."Project"
        ON "Project"."id" = "TrackedKeyword"."projectId"
      WHERE "TrackedKeyword"."id" = "KeywordRankSnapshot"."keywordId"
        AND "Project"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "keywordranksnapshot_select_anon_via_active_share"
  ON "public"."KeywordRankSnapshot"
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."TrackedKeyword"
      JOIN "public"."PublicShare"
        ON "PublicShare"."projectId" = "TrackedKeyword"."projectId"
      WHERE "TrackedKeyword"."id" = "KeywordRankSnapshot"."keywordId"
        AND "PublicShare"."enabled" = true
        AND ("PublicShare"."expiresAt" IS NULL OR "PublicShare"."expiresAt" > now())
    )
  );
