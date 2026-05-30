// SEO Analyzer — SiteLens
//
// Designed using the seo-audit + seo-schema skill frameworks.
// Scores 10 categories (100pt total) and validates JSON-LD structured data
// against Schema.org required property rules.
//
// Priority levels: Critical > High > Medium > Low

export type SeoCheckStatus = "pass" | "warning" | "fail"
export type SeoSeverity = "critical" | "high" | "medium" | "low"

export interface SeoCheck {
  id: string
  label: string
  severity: SeoSeverity
  status: SeoCheckStatus
  score: number     // actual
  maxScore: number  // possible
  detail: string
  value?: string    // extracted value for display
}

export interface JsonLdResult {
  type: string
  raw: Record<string, unknown>
  issues: string[]
  status: SeoCheckStatus
}

export interface SeoAnalysisResult {
  url: string
  analyzedAt: string
  score: number        // 0-100
  checks: SeoCheck[]
  jsonLd: JsonLdResult[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    passed: number
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']|` +
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
    "i",
  )
  const m = re.exec(html)
  return m ? (m[1] ?? m[2] ?? null) : null
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html)
  return m ? m[1].trim() : null
}

function extractH1s(html: string): string[] {
  const re = /<h1[^>]*>([^<]*(?:<(?!\/h1>)[^<]*)*)<\/h1>/gi
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    results.push(m[1].replace(/<[^>]+>/g, "").trim())
  }
  return results
}

function extractCanonical(html: string): string | null {
  const m = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html)
  return m ? m[1] : null
}

function extractRobotsMeta(html: string): string | null {
  return extractMeta(html, "robots")
}

function extractImages(html: string): { src: string; alt: string | null }[] {
  const re = /<img([^>]+)>/gi
  const images: { src: string; alt: string | null }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1]
    const srcM = /src=["']([^"']+)["']/i.exec(attrs)
    const altM = /alt=["']([^"']*)["']/i.exec(attrs)
    if (srcM) {
      images.push({ src: srcM[1], alt: altM ? altM[1] : null })
    }
  }
  return images
}

function extractHreflang(html: string): string[] {
  const re = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]*>/gi
  const langs: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) langs.push(m[1])
  return langs
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const results: Record<string, unknown>[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) results.push(...parsed)
      else results.push(parsed)
    } catch {
      // ignore malformed
    }
  }
  return results
}

// ── JSON-LD validation (seo-schema skill) ────────────────────────────────────

const REQUIRED_PROPS: Record<string, string[]> = {
  Article:        ["headline", "author", "datePublished", "publisher"],
  NewsArticle:    ["headline", "author", "datePublished", "publisher"],
  BlogPosting:    ["headline", "author", "datePublished"],
  Product:        ["name", "image", "offers"],
  Organization:   ["name", "url"],
  WebSite:        ["name", "url"],
  WebPage:        ["name", "url"],
  BreadcrumbList: ["itemListElement"],
  FAQPage:        ["mainEntity"],
  HowTo:          ["name", "step"],
  LocalBusiness:  ["name", "address"],
  Event:          ["name", "startDate", "location"],
}

function validateJsonLd(raw: Record<string, unknown>): JsonLdResult {
  const type = (raw["@type"] as string) ?? "Unknown"
  const issues: string[] = []

  // @context check (seo-schema: common error #4)
  if (!raw["@context"]) {
    issues.push('Missing "@context": "https://schema.org"')
  }

  // Required properties per type
  const required = REQUIRED_PROPS[type] ?? []
  for (const prop of required) {
    if (raw[prop] === undefined || raw[prop] === null || raw[prop] === "") {
      issues.push(`Missing required property: "${prop}"`)
    }
  }

  // Article: ISO 8601 date check
  if (["Article", "NewsArticle", "BlogPosting"].includes(type)) {
    const dp = raw["datePublished"] as string | undefined
    if (dp && !/^\d{4}-\d{2}-\d{2}/.test(dp)) {
      issues.push(`"datePublished" should be ISO 8601 format (e.g. 2025-01-15T08:00:00Z)`)
    }
  }

  // URL fields: must be absolute
  for (const field of ["url", "image"]) {
    const val = raw[field] as string | undefined
    if (val && !val.startsWith("http")) {
      issues.push(`"${field}" must be an absolute URL (starts with https://)`)
    }
  }

  const status: SeoCheckStatus =
    issues.length === 0 ? "pass" : issues.length <= 2 ? "warning" : "fail"

  return { type, raw, issues, status }
}

// ── Main analyzer ─────────────────────────────────────────────────────────────

export async function analyzeSeo(url: string): Promise<SeoAnalysisResult> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "SiteLens-SEO/1.0" },
  })
  const html = await res.text()

  const checks: SeoCheck[] = []

  // ── 1. Title (15pt) ──────────────────────────────────────────────
  const title = extractTitle(html)
  const titleLen = title?.length ?? 0
  let titleScore = 0
  let titleStatus: SeoCheckStatus = "fail"
  let titleDetail = "Missing <title> tag"
  if (title) {
    if (titleLen >= 50 && titleLen <= 60) {
      titleScore = 15; titleStatus = "pass"; titleDetail = `${titleLen} chars — optimal`
    } else if (titleLen > 0) {
      titleScore = 8; titleStatus = "warning"
      titleDetail = titleLen < 50 ? `${titleLen} chars — too short (aim for 50-60)` : `${titleLen} chars — too long (aim for 50-60)`
    }
  }
  checks.push({ id: "title", label: "Title tag", severity: "critical", status: titleStatus, score: titleScore, maxScore: 15, detail: titleDetail, value: title ?? undefined })

  // ── 2. Meta description (15pt) ───────────────────────────────────
  const desc = extractMeta(html, "description")
  const descLen = desc?.length ?? 0
  let descScore = 0; let descStatus: SeoCheckStatus = "fail"; let descDetail = "Missing meta description"
  if (desc) {
    if (descLen >= 120 && descLen <= 158) {
      descScore = 15; descStatus = "pass"; descDetail = `${descLen} chars — optimal`
    } else {
      descScore = 8; descStatus = "warning"
      descDetail = descLen < 120 ? `${descLen} chars — too short (aim for 120-158)` : `${descLen} chars — too long (aim for 120-158)`
    }
  }
  checks.push({ id: "description", label: "Meta description", severity: "critical", status: descStatus, score: descScore, maxScore: 15, detail: descDetail, value: desc ?? undefined })

  // ── 3. H1 (10pt) ─────────────────────────────────────────────────
  const h1s = extractH1s(html)
  let h1Score = 0; let h1Status: SeoCheckStatus = "fail"; let h1Detail = "No <h1> found"
  if (h1s.length === 1) { h1Score = 10; h1Status = "pass"; h1Detail = "Exactly one <h1>" }
  else if (h1s.length > 1) { h1Score = 5; h1Status = "warning"; h1Detail = `${h1s.length} <h1> tags found — use exactly one` }
  checks.push({ id: "h1", label: "H1 tag", severity: "high", status: h1Status, score: h1Score, maxScore: 10, detail: h1Detail, value: h1s[0] })

  // ── 4. Canonical (10pt) ──────────────────────────────────────────
  const canonical = extractCanonical(html)
  let canonScore = 0; let canonStatus: SeoCheckStatus = "fail"; let canonDetail = "No canonical tag"
  if (canonical) {
    const isSelf = canonical.replace(/\/$/, "") === url.replace(/\/$/, "")
    canonScore = 10; canonStatus = "pass"
    canonDetail = isSelf ? "Self-referencing canonical — correct" : `Points to: ${canonical}`
  }
  checks.push({ id: "canonical", label: "Canonical tag", severity: "high", status: canonStatus, score: canonScore, maxScore: 10, detail: canonDetail, value: canonical ?? undefined })

  // ── 5. OGP (10pt) ────────────────────────────────────────────────
  const ogTitle = extractMeta(html, "og:title")
  const ogDesc  = extractMeta(html, "og:description")
  const ogImage = extractMeta(html, "og:image")
  const ogScore = (ogTitle ? 4 : 0) + (ogDesc ? 3 : 0) + (ogImage ? 3 : 0)
  const ogStatus: SeoCheckStatus = ogScore === 10 ? "pass" : ogScore >= 4 ? "warning" : "fail"
  const ogMissing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean)
  checks.push({ id: "ogp", label: "Open Graph (OGP)", severity: "medium", status: ogStatus, score: ogScore, maxScore: 10, detail: ogScore === 10 ? "All OGP tags present" : `Missing: ${ogMissing.join(", ")}` })

  // ── 6. Twitter Card (5pt) ────────────────────────────────────────
  const twCard = extractMeta(html, "twitter:card")
  const twScore = twCard ? 5 : 0
  checks.push({ id: "twitter", label: "Twitter Card", severity: "low", status: twCard ? "pass" : "warning", score: twScore, maxScore: 5, detail: twCard ? `card type: ${twCard}` : "Missing twitter:card meta tag", value: twCard ?? undefined })

  // ── 7. Robots meta (10pt) ────────────────────────────────────────
  const robots = extractRobotsMeta(html)
  const noindex = robots ? /noindex/i.test(robots) : false
  const robotsScore = noindex ? 0 : 10
  const robotsStatus: SeoCheckStatus = noindex ? "fail" : "pass"
  checks.push({ id: "robots", label: "Robots meta", severity: "critical", status: robotsStatus, score: robotsScore, maxScore: 10, detail: noindex ? `⚠ noindex detected — page will not be indexed` : robots ? `"${robots}"` : "No robots meta (defaults to index,follow)", value: robots ?? undefined })

  // ── 8. JSON-LD structured data (10pt) ────────────────────────────
  const rawJsonLd = extractJsonLd(html)
  const jsonLd = rawJsonLd.map(validateJsonLd)
  const jldScore = Math.min(10, jsonLd.length * 2)
  const jldStatus: SeoCheckStatus = jsonLd.length === 0 ? "warning" : jsonLd.some(j => j.status === "fail") ? "warning" : "pass"
  checks.push({ id: "structured-data", label: "Structured data (JSON-LD)", severity: "medium", status: jldStatus, score: jldScore, maxScore: 10, detail: jsonLd.length === 0 ? "No JSON-LD found" : `${jsonLd.length} block(s): ${jsonLd.map(j => j.type).join(", ")}` })

  // ── 9. Image alt (10pt) ──────────────────────────────────────────
  const images = extractImages(html)
  const missingAlt = images.filter(i => i.alt === null || i.alt === "").length
  let altScore = 10; let altStatus: SeoCheckStatus = "pass"
  if (images.length > 0) {
    const ratio = missingAlt / images.length
    altScore = Math.round(10 * (1 - ratio))
    altStatus = ratio === 0 ? "pass" : ratio < 0.3 ? "warning" : "fail"
  }
  checks.push({ id: "alt", label: "Image alt attributes", severity: "high", status: altStatus, score: altScore, maxScore: 10, detail: images.length === 0 ? "No images found" : `${missingAlt}/${images.length} images missing alt text` })

  // ── 10. Hreflang (5pt) ───────────────────────────────────────────
  const hreflang = extractHreflang(html)
  const hreflangScore = hreflang.length > 0 ? 5 : 3 // 3pt if absent (not required for monolingual sites)
  checks.push({ id: "hreflang", label: "Hreflang tags", severity: "low", status: hreflang.length > 0 ? "pass" : "warning", score: hreflangScore, maxScore: 5, detail: hreflang.length > 0 ? `${hreflang.length} hreflang tag(s): ${hreflang.slice(0, 4).join(", ")}` : "No hreflang tags (OK for single-language sites)" })

  const totalScore = checks.reduce((s, c) => s + c.score, 0)
  const maxTotal   = checks.reduce((s, c) => s + c.maxScore, 0)
  const score = Math.round((totalScore / maxTotal) * 100)

  const summary = {
    critical: checks.filter(c => c.severity === "critical" && c.status !== "pass").length,
    high:     checks.filter(c => c.severity === "high"     && c.status !== "pass").length,
    medium:   checks.filter(c => c.severity === "medium"   && c.status !== "pass").length,
    low:      checks.filter(c => c.severity === "low"      && c.status !== "pass").length,
    passed:   checks.filter(c => c.status === "pass").length,
  }

  return { url, analyzedAt: new Date().toISOString(), score, checks, jsonLd, summary }
}
