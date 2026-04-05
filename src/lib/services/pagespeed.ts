// PageSpeed Insights API service — SiteLens
//
// Prerequisites:
//   1. Set PAGESPEED_API_KEY in .env.local (Google Cloud Console → API & Services)
//   2. Enable "PageSpeed Insights API" in the Google Cloud project
//
// Docs: https://developers.google.com/speed/docs/insights/v5/get-started

const PAGESPEED_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// ─── PSI response types (subset used by the pipeline) ────────────────────────

export type PageSpeedStrategy = "DESKTOP" | "MOBILE";

export type PSICategory = {
  id: string;
  title: string;
  score: number | null;
  auditRefs: Array<{ id: string; weight: number; group?: string }>;
};

export type PSIAudit = {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  scoreDisplayMode:
    | "binary"
    | "numeric"
    | "informative"
    | "error"
    | "notApplicable"
    | "manual";
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
};

export type PSILighthouseResult = {
  categories: {
    performance?: PSICategory;
    accessibility?: PSICategory;
    "best-practices"?: PSICategory;
    seo?: PSICategory;
  };
  audits: Record<string, PSIAudit>;
};

export type PSIResponse = {
  id: string;
  lighthouseResult: PSILighthouseResult;
};

// ─── runPageSpeedAudit ────────────────────────────────────────────────────────

/**
 * Call the PageSpeed Insights API and return the full typed response.
 *
 * Throws on:
 *   - Missing API key (configuration error)
 *   - Non-2xx HTTP response from Google (API error)
 *   - Network failure (fetch error)
 */
export async function runPageSpeedAudit(
  url: string,
  strategy: PageSpeedStrategy = "MOBILE",
): Promise<PSIResponse> {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    throw new Error(
      "[pagespeed] PAGESPEED_API_KEY is not set. " +
        "Set it in .env.local (Google Cloud Console → API & Services → Credentials).",
    );
  }

  const endpoint = new URL(PAGESPEED_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", apiKey);
  // Request all categories explicitly
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    endpoint.searchParams.append("category", cat);
  }

  const response = await fetch(endpoint.toString(), {
    // PSI can be slow; allow up to 55 seconds (Vercel function limit is 60s)
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[pagespeed] API request failed: ${response.status} ${response.statusText}. ${body}`,
    );
  }

  return response.json() as Promise<PSIResponse>;
}
