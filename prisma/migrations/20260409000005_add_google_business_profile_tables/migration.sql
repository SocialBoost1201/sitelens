-- Migration: add_google_business_profile_tables
-- Adds Google OAuth token storage and synced Google Business Profile locations.

CREATE TABLE "GoogleIntegration" (
  "id"           TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "accessToken"  TEXT         NOT NULL,
  "refreshToken" TEXT,
  "expiryDate"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GoogleIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GbpLocation" (
  "id"                  TEXT         NOT NULL,
  "googleIntegrationId" TEXT         NOT NULL,
  "googleLocationId"    TEXT         NOT NULL,
  "title"               TEXT         NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GbpLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoogleIntegration_userId_idx" ON "GoogleIntegration"("userId");
CREATE UNIQUE INDEX "GbpLocation_googleLocationId_key" ON "GbpLocation"("googleLocationId");
CREATE INDEX "GbpLocation_googleIntegrationId_idx" ON "GbpLocation"("googleIntegrationId");

ALTER TABLE "GbpLocation"
  ADD CONSTRAINT "GbpLocation_googleIntegrationId_fkey"
  FOREIGN KEY ("googleIntegrationId") REFERENCES "GoogleIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
