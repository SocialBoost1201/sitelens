// Uptime Checker — SiteLens
//
// HEAD-requests a URL to determine UP / DOWN / DEGRADED status.
// Thresholds: < 2000ms = UP, < 5000ms = DEGRADED, else DOWN.

const TIMEOUT_MS = 10_000
const DEGRADED_THRESHOLD_MS = 2_000
const DOWN_THRESHOLD_MS     = 5_000

export type UptimeStatus = "UP" | "DOWN" | "DEGRADED"

export interface UptimeCheckResult {
  url: string
  checkedAt: string
  status: UptimeStatus
  latencyMs: number | null
  statusCode: number | null
  error: string | null
}

export async function checkUptime(url: string): Promise<UptimeCheckResult> {
  const checkedAt = new Date().toISOString()
  const start = Date.now()

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "SiteLens-Uptime/1.0" },
      redirect: "follow",
    })

    const latencyMs = Date.now() - start
    const statusCode = res.status

    // Non-2xx/3xx → DOWN
    if (statusCode >= 400) {
      return { url, checkedAt, status: "DOWN", latencyMs, statusCode, error: `HTTP ${statusCode}` }
    }

    const status: UptimeStatus =
      latencyMs < DEGRADED_THRESHOLD_MS ? "UP" :
      latencyMs < DOWN_THRESHOLD_MS     ? "DEGRADED" : "DOWN"

    return { url, checkedAt, status, latencyMs, statusCode, error: null }
  } catch (err) {
    const latencyMs = Date.now() - start
    const error = err instanceof Error ? err.message : "Connection failed"
    return { url, checkedAt, status: "DOWN", latencyMs, statusCode: null, error }
  }
}
