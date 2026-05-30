import { db } from "@/lib/db/client"
import type { GbpDailyMetricInput } from "@/lib/gbp/performance"

export async function saveDailyMetrics({
  gbpLocationId,
  metrics,
}: {
  gbpLocationId: string
  metrics: GbpDailyMetricInput[]
}): Promise<void> {
  for (const metric of metrics) {
    await db.gbpDailyMetric.upsert({
      where: {
        gbpLocationId_metricDate_metricName: {
          gbpLocationId,
          metricDate: metric.metricDate,
          metricName: metric.metricName,
        },
      },
      update: {
        metricValue: metric.metricValue,
      },
      create: {
        gbpLocationId,
        metricDate: metric.metricDate,
        metricName: metric.metricName,
        metricValue: metric.metricValue,
      },
    })
  }
}
