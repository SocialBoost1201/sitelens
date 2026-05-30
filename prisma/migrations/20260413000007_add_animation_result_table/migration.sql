-- Migration: add_animation_result_table
-- Adds persisted animation analysis results per project.

CREATE TABLE "AnimationResult" (
  "id"             TEXT         NOT NULL,
  "projectId"      TEXT         NOT NULL,
  "url"            TEXT         NOT NULL,
  "analyzedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalCount"     INTEGER      NOT NULL DEFAULT 0,
  "gpuComposited"  INTEGER      NOT NULL DEFAULT 0,
  "nonComposited"  INTEGER      NOT NULL DEFAULT 0,
  "loopCount"      INTEGER      NOT NULL DEFAULT 0,
  "reducedMotion"  BOOLEAN      NOT NULL DEFAULT false,
  "clsRisk"        BOOLEAN      NOT NULL DEFAULT false,
  "data"           JSONB        NOT NULL DEFAULT '{}',

  CONSTRAINT "AnimationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnimationResult_projectId_idx"
  ON "AnimationResult"("projectId");
CREATE INDEX "AnimationResult_projectId_analyzedAt_idx"
  ON "AnimationResult"("projectId", "analyzedAt");

ALTER TABLE "AnimationResult"
  ADD CONSTRAINT "AnimationResult_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnimationResult" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own animation results"
  ON "AnimationResult" FOR ALL
  USING (
    "projectId" IN (
      SELECT id FROM "Project" WHERE "userId" = auth.uid()::text
    )
  );
