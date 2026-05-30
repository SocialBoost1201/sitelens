import { getValidAccessToken } from "@/lib/gbp/auth"
import type { GbpLocation, GoogleIntegration } from "@/generated/prisma/client"

const PERFORMANCE_API_BASE =
  "https://businessprofileperformance.googleapis.com/v1"

const DAILY_METRICS = [
  "WEBSITE_CLICKS",
  "CALL_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
] as const

type DailyMetricName = (typeof DAILY_METRICS)[number]

type GoogleDate = {
  year?: number
  month?: number
  day?: number
}

type DailyMetricTimeSeriesResponse = {
  timeSeries?: {
    datedValues?: Array<{
      date?: GoogleDate
      value?: string
    }>
  }
}

export type GbpDailyMetricInput = {
  gbpLocationId: string
  metricDate: Date
  metricName: DailyMetricName
  metricValue: number
}

function getLast30DayRange() {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)

  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 29)

  return { start, end }
}

function buildDateParts(date: Date) {
  return {
    year: date.getUTCFullYear().toString(),
    month: (date.getUTCMonth() + 1).toString(),
    day: date.getUTCDate().toString(),
  }
}

function buildMetricDate(date?: GoogleDate): Date | null {
  if (!date?.year || !date.month || !date.day) {
    return null
  }

  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

function buildLocationResourceName(location: GbpLocation): string {
  return `locations/${location.googleLocationId}`
}

async function fetchMetricTimeSeries(
  accessToken: string,
  locationName: string,
  metricName: DailyMetricName,
): Promise<DailyMetricTimeSeriesResponse> {
  const { start, end } = getLast30DayRange()
  const startDate = buildDateParts(start)
  const endDate = buildDateParts(end)
  const endpoint = new URL(
    `${PERFORMANCE_API_BASE}/${locationName}:getDailyMetricsTimeSeries`,
  )

  endpoint.searchParams.set("dailyMetric", metricName)
  endpoint.searchParams.set("dailyRange.startDate.year", startDate.year)
  endpoint.searchParams.set("dailyRange.startDate.month", startDate.month)
  endpoint.searchParams.set("dailyRange.startDate.day", startDate.day)
  endpoint.searchParams.set("dailyRange.endDate.year", endDate.year)
  endpoint.searchParams.set("dailyRange.endDate.month", endDate.month)
  endpoint.searchParams.set("dailyRange.endDate.day", endDate.day)

  const response = await fetch(endpoint.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch Google Business Profile performance metrics")
  }

  return response.json() as Promise<DailyMetricTimeSeriesResponse>
}

export async function fetchDailyMetrics({
  integration,
  location,
}: {
  integration: GoogleIntegration
  location: GbpLocation
}): Promise<GbpDailyMetricInput[]> {
  const accessToken = await getValidAccessToken(integration)
  const locationName = buildLocationResourceName(location)
  const metrics: GbpDailyMetricInput[] = []

  for (const metricName of DAILY_METRICS) {
    const payload = await fetchMetricTimeSeries(accessToken, locationName, metricName)

    for (const datedValue of payload.timeSeries?.datedValues ?? []) {
      const metricDate = buildMetricDate(datedValue.date)
      if (!metricDate) continue

      metrics.push({
        gbpLocationId: location.id,
        metricDate,
        metricName,
        metricValue: Number.parseInt(datedValue.value ?? "0", 10),
      })
    }
  }

  return metrics
}
