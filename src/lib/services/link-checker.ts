// Broken Link Checker — SiteLens
//
// Fetches a page, extracts all <a href> links, then HEAD-requests each unique
// URL. Returns broken links (4xx/5xx/connection errors).
// Internal and external links are both checked.

import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

const FETCH_TIMEOUT_MS = 8_000
const MAX_LINKS = 200
const CONCURRENCY = 10

export interface BrokenLinkResult {
  pageUrl: string
  checkedAt: string
  totalLinks: number
  brokenLinks: BrokenLink[]
  summary: {
    ok: number
    broken: number
    skipped: number
  }
}

export interface BrokenLink {
  url: string
  statusCode: number | null
  error: string | null
  type: "internal" | "external"
}

function extractLinks(html: string, origin: string): { url: string; type: "internal" | "external" }[] {
  const re = /href=["']([^"'#]+)["']/gi
  const seen = new Set<string>()
  const links: { url: string; type: "internal" | "external" }[] = []
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) !== null && links.length < MAX_LINKS) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue

    let abs: string
    try {
      abs = new URL(raw, origin).href
    } catch {
      continue
    }

    // Skip fragment-only
    if (abs === origin || seen.has(abs)) continue
    seen.add(abs)

    const type = abs.startsWith(origin) ? "internal" : "external"
    links.push({ url: abs, type })
  }

  return links
}

async function checkLink(
  url: string,
): Promise<{ ok: boolean; skipped: boolean; statusCode: number | null; error: string | null }> {
  let safeUrl: string
  try {
    safeUrl = await assertSafeExternalHttpUrl(url)
  } catch (error) {
    if (isUnsafeExternalUrlError(error)) {
      return { ok: true, skipped: true, statusCode: null, error: error.message }
    }
    throw error
  }

  try {
    const res = await fetch(safeUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "SiteLens-LinkChecker/1.0" },
      redirect: "follow",
    })
    const ok = res.status < 400
    return { ok, skipped: false, statusCode: res.status, error: null }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Connection failed"
    return { ok: false, skipped: false, statusCode: null, error }
  }
}

// Run checks with limited concurrency
async function checkAll(
  links: { url: string; type: "internal" | "external" }[],
): Promise<{ url: string; type: "internal" | "external"; ok: boolean; skipped: boolean; statusCode: number | null; error: string | null }[]> {
  const results: { url: string; type: "internal" | "external"; ok: boolean; skipped: boolean; statusCode: number | null; error: string | null }[] = []

  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const batch = links.slice(i, i + CONCURRENCY)
    const settled = await Promise.all(
      batch.map(async (link) => {
        const result = await checkLink(link.url)
        return { ...result, url: link.url, type: link.type }
      }),
    )
    results.push(...settled)
  }

  return results
}

export async function checkBrokenLinks(pageUrl: string): Promise<BrokenLinkResult> {
  const safePageUrl = await assertSafeExternalHttpUrl(pageUrl)
  const origin = new URL(safePageUrl).origin

  // Fetch the page HTML
  const res = await fetch(safePageUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "SiteLens-LinkChecker/1.0" },
  })
  const html = await res.text()

  const links = extractLinks(html, origin)
  const results = await checkAll(links)

  const brokenLinks: BrokenLink[] = results
    .filter((r) => !r.ok && !r.skipped)
    .map((r) => ({
      url: r.url,
      statusCode: r.statusCode,
      error: r.error,
      type: r.type,
    }))

  const summary = {
    ok: results.filter((r) => r.ok && !r.skipped).length,
    broken: brokenLinks.length,
    skipped: results.filter((r) => r.skipped).length,
  }

  return {
    pageUrl: safePageUrl,
    checkedAt: new Date().toISOString(),
    totalLinks: links.length,
    brokenLinks,
    summary,
  }
}
