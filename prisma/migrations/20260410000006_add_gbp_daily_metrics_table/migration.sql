-- Migration: add_gbp_daily_metrics_table
-- Adds daily Google Business Profile performance metrics per saved location.

CREATE TABLE "GbpDailyMetric" (
  "id"            TEXT         NOT NULL,
  "gbpLocationId" TEXT         NOT NULL,
  "metricDate"    TIMESTAMP(3) NOT NULL,
  "metricName"    TEXT         NOT NULL,
  "metricValue"   INTEGER      NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GbpDailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GbpDailyMetric_gbpLocationId_metricDate_metricName_key"
  ON "GbpDailyMetric"("gbpLocationId", "metricDate", "metricName");
CREATE INDEX "GbpDailyMetric_gbpLocationId_metricDate_idx"
  ON "GbpDailyMetric"("gbpLocationId", "metricDate");

ALTER TABLE "GbpDailyMetric"
  ADD CONSTRAINT "GbpDailyMetric_gbpLocationId_fkey"
  FOREIGN KEY ("gbpLocationId") REFERENCES "GbpLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
