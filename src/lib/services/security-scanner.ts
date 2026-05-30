// Security Header Scanner — SiteLens
//
// Checks HTTP response headers against OWASP security header recommendations.
// Grades A+ to F based on weighted scoring.

export type SecurityGrade = "A+" | "A" | "B" | "C" | "D" | "F"
export type HeaderStatus = "pass" | "warning" | "fail"

export interface HeaderCheck {
  name: string
  present: boolean
  value: string | null
  status: HeaderStatus
  score: number     // actual
  maxScore: number  // possible
  detail: string
  recommendation: string
}

export interface SecurityScanResult {
  url: string
  scannedAt: string
  grade: SecurityGrade
  score: number        // 0-100
  https: boolean
  headers: HeaderCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
  }
}

function gradeFromScore(score: number): SecurityGrade {
  if (score >= 95) return "A+"
  if (score >= 80) return "A"
  if (score >= 65) return "B"
  if (score >= 50) return "C"
  if (score >= 35) return "D"
  return "F"
}

const HEADER_RULES: {
  name: string
  maxScore: number
  check: (value: string | null) => { status: HeaderStatus; score: number; detail: string }
  recommendation: string
}[] = [
  {
    name: "Strict-Transport-Security",
    maxScore: 20,
    check(v) {
      if (!v) return { status: "fail", score: 0, detail: "Missing — site may be downgraded to HTTP" }
      const maxAge = /max-age=(\d+)/i.exec(v)
      const age = maxAge ? parseInt(maxAge[1]) : 0
      if (age >= 31536000) return { status: "pass", score: 20, detail: `max-age=${age} (≥1 year)${/includeSubDomains/i.test(v) ? " + includeSubDomains" : ""}` }
      return { status: "warning", score: 10, detail: `max-age=${age} — increase to at least 31536000 (1 year)` }
    },
    recommendation: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
  },
  {
    name: "Content-Security-Policy",
    maxScore: 25,
    check(v) {
      if (!v) return { status: "fail", score: 0, detail: "Missing — XSS and injection attacks not mitigated" }
      if (/unsafe-inline/i.test(v) && !/nonce-|sha256-/i.test(v)) return { status: "warning", score: 12, detail: "Present but uses 'unsafe-inline' without nonce/hash" }
      return { status: "pass", score: 25, detail: "Present" }
    },
    recommendation: "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; ...",
  },
  {
    name: "X-Frame-Options",
    maxScore: 15,
    check(v) {
      if (!v) return { status: "fail", score: 0, detail: "Missing — clickjacking attacks possible" }
      if (/^(DENY|SAMEORIGIN)$/i.test(v.trim())) return { status: "pass", score: 15, detail: v }
      return { status: "warning", score: 8, detail: `Value "${v}" is non-standard` }
    },
    recommendation: "X-Frame-Options: DENY",
  },
  {
    name: "X-Content-Type-Options",
    maxScore: 10,
    check(v) {
      if (!v) return { status: "fail", score: 0, detail: "Missing — MIME-type sniffing attacks possible" }
      if (/^nosniff$/i.test(v.trim())) return { status: "pass", score: 10, detail: "nosniff" }
      return { status: "warning", score: 5, detail: `Unexpected value: "${v}"` }
    },
    recommendation: "X-Content-Type-Options: nosniff",
  },
  {
    name: "Referrer-Policy",
    maxScore: 10,
    check(v) {
      if (!v) return { status: "warning", score: 5, detail: "Missing — defaults to browser behavior" }
      const safe = ["no-referrer", "strict-origin", "strict-origin-when-cross-origin", "same-origin", "no-referrer-when-downgrade"]
      if (safe.some(s => v.toLowerCase().includes(s))) return { status: "pass", score: 10, detail: v }
      return { status: "warning", score: 5, detail: `"${v}" may leak referrer info` }
    },
    recommendation: "Referrer-Policy: strict-origin-when-cross-origin",
  },
  {
    name: "Permissions-Policy",
    maxScore: 10,
    check(v) {
      if (!v) return { status: "warning", score: 5, detail: "Missing — browser feature access not restricted" }
      return { status: "pass", score: 10, detail: "Present" }
    },
    recommendation: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
  },
  {
    name: "X-XSS-Protection",
    maxScore: 10,
    check(v) {
      if (!v) return { status: "warning", score: 5, detail: "Missing (deprecated in modern browsers; CSP is preferred)" }
      if (/^0$/i.test(v.trim())) return { status: "pass", score: 10, detail: "Disabled — correct approach when CSP is in place" }
      return { status: "pass", score: 8, detail: v }
    },
    recommendation: "X-XSS-Protection: 0 (disable when CSP is properly configured)",
  },
]

export async function scanSecurity(url: string): Promise<SecurityScanResult> {
  const parsedUrl = new URL(url)
  const https = parsedUrl.protocol === "https:"

  const res = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "SiteLens-Security/1.0" },
    redirect: "follow",
  })

  const headerChecks: HeaderCheck[] = HEADER_RULES.map((rule) => {
    const value = res.headers.get(rule.name)
    const { status, score, detail } = rule.check(value)
    return {
      name: rule.name,
      present: value !== null,
      value,
      status,
      score,
      maxScore: rule.maxScore,
      detail,
      recommendation: rule.recommendation,
    }
  })

  // HTTPS bonus: no score but affects grade
  const httpsBonus = https ? 0 : -20

  const totalScore = headerChecks.reduce((s, h) => s + h.score, 0)
  const maxTotal   = headerChecks.reduce((s, h) => s + h.maxScore, 0)
  const rawScore   = Math.round((totalScore / maxTotal) * 100) + httpsBonus
  const score      = Math.max(0, Math.min(100, rawScore))
  const grade      = gradeFromScore(score)

  const summary = {
    passed:   headerChecks.filter(h => h.status === "pass").length,
    warnings: headerChecks.filter(h => h.status === "warning").length,
    failed:   headerChecks.filter(h => h.status === "fail").length,
  }

  return {
    url,
    scannedAt: new Date().toISOString(),
    grade,
    score,
    https,
    headers: headerChecks,
    summary,
  }
}
