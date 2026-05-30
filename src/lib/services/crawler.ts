// Sitemap crawler — SiteLens
//
// Discovery order:
//   1. robots.txt → Sitemap: directive
//   2. /sitemap.xml
//   3. /sitemap_index.xml (up to 3 child sitemaps)
//   4. Fallback: parse <a href> links on the homepage (internal only, up to 200)
//
// Returns a deduplicated, sorted array of absolute URLs belonging to the same
// origin as the project root URL. Max 500 URLs returned.

import { assertSafeExternalHttpUrl } from "@/lib/security/url"

const MAX_URLS = 500
const FETCH_TIMEOUT_MS = 10_000

async function safeFetch(url: string): Promise<Response | null> {
  try {
    const safeUrl = await assertSafeExternalHttpUrl(url)
    const res = await fetch(safeUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "SiteLens-Crawler/1.0" },
    })
    return res.ok ? res : null
  } catch {
    return null
  }
}

/** Extract <loc> values from a sitemap XML string */
function extractLocsFromSitemap(xml: string): string[] {
  const locs: string[] = []
  const locRegex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = locRegex.exec(xml)) !== null) {
    locs.push(m[1].trim())
  }
  return locs
}

/** Extract Sitemap: lines from robots.txt */
function extractSitemapsFromRobots(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^sitemap:/i.test(l.trim()))
    .map((l) => l.replace(/^sitemap:\s*/i, "").trim())
    .filter((u) => u.startsWith("http"))
}

/** Parse <a href> links from HTML, returning same-origin absolute URLs */
function extractInternalLinks(html: string, origin: string): string[] {
  const hrefs: string[] = []
  const re = /href=["']([^"'#?]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    try {
      const abs = new URL(raw, origin).href
      if (abs.startsWith(origin)) hrefs.push(abs)
    } catch {
      // ignore malformed
    }
  }
  return hrefs
}

export interface CrawlResult {
  urls: string[]
  source: "sitemap" | "robots+sitemap" | "html-links"
  sitemapUrl?: string
}

export async function crawlSiteUrls(rootUrl: string): Promise<CrawlResult> {
  const safeRootUrl = await assertSafeExternalHttpUrl(rootUrl)
  const origin = new URL(safeRootUrl).origin

  // ── Step 1: robots.txt ──────────────────────────────────────────
  const robotsRes = await safeFetch(`${origin}/robots.txt`)
  if (robotsRes) {
    const text = await robotsRes.text()
    const sitemapUrls = extractSitemapsFromRobots(text)
    if (sitemapUrls.length > 0) {
      const urls = await fetchSitemapUrls(sitemapUrls[0], origin)
      if (urls.length > 0) {
        return { urls: dedup(urls).slice(0, MAX_URLS), source: "robots+sitemap", sitemapUrl: sitemapUrls[0] }
      }
    }
  }

  // ── Step 2: /sitemap.xml ─────────────────────────────────────────
  const sitemapXmlUrl = `${origin}/sitemap.xml`
  const xmlUrls = await fetchSitemapUrls(sitemapXmlUrl, origin)
  if (xmlUrls.length > 0) {
    return { urls: dedup(xmlUrls).slice(0, MAX_URLS), source: "sitemap", sitemapUrl: sitemapXmlUrl }
  }

  // ── Step 3: /sitemap_index.xml ───────────────────────────────────
  const indexUrl = `${origin}/sitemap_index.xml`
  const indexRes = await safeFetch(indexUrl)
  if (indexRes) {
    const indexXml = await indexRes.text()
    const childUrls = extractLocsFromSitemap(indexXml).filter((u) => {
      try {
        return u.endsWith(".xml") && new URL(u).origin === origin
      } catch {
        return false
      }
    })
    const allLocs: string[] = []
    for (const child of childUrls.slice(0, 3)) {
      const childLocs = await fetchSitemapUrls(child, origin)
      allLocs.push(...childLocs)
      if (allLocs.length >= MAX_URLS) break
    }
    if (allLocs.length > 0) {
      return { urls: dedup(allLocs).slice(0, MAX_URLS), source: "sitemap", sitemapUrl: indexUrl }
    }
  }

  // ── Step 4: Fallback — parse homepage links ──────────────────────
  const homeRes = await safeFetch(safeRootUrl)
  if (homeRes) {
    const html = await homeRes.text()
    const links = extractInternalLinks(html, origin)
    // Always include the root URL itself
    const all = [safeRootUrl, ...links]
    return { urls: dedup(all).slice(0, 200), source: "html-links" }
  }

  // Nothing found — return just the root URL
  return { urls: [safeRootUrl], source: "html-links" }
}

async function fetchSitemapUrls(url: string, origin: string): Promise<string[]> {
  const res = await safeFetch(url)
  if (!res) return []
  const xml = await res.text()

  // Check if it's a sitemap index (contains <sitemapindex>)
  if (/<sitemapindex/i.test(xml)) {
    const childXmls = extractLocsFromSitemap(xml).filter((u) => {
      try {
        return u.endsWith(".xml") && new URL(u).origin === origin
      } catch {
        return false
      }
    })
    const all: string[] = []
    for (const child of childXmls.slice(0, 3)) {
      const childLocs = await fetchSitemapUrls(child, origin)
      all.push(...childLocs)
      if (all.length >= MAX_URLS) break
    }
    return all
  }

  // Regular sitemap — extract <loc> entries that match the origin
  return extractLocsFromSitemap(xml).filter((u) => new URL(u).origin === origin)
}

function dedup(urls: string[]): string[] {
  // Normalise trailing slash and deduplicate
  const seen = new Set<string>()
  const result: string[] = []
  for (const u of urls) {
    const norm = u.replace(/\/$/, "")
    if (!seen.has(norm)) {
      seen.add(norm)
      result.push(u)
    }
  }
  return result.sort()
}
