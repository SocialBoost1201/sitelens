// Google Search Console API service — SiteLens
//
// Server-to-server auth via Google service account (JWT).
// Access tokens are cached in-process and refreshed 60s before expiry.
//
// Prerequisites:
//   1. Create a Google Cloud service account
//   2. Enable "Google Search Console API" in the Cloud project
//   3. Grant the service account "Restricted" or "Full" access in Search Console
//   4. Set in .env.local:
//        GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
//        GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
//
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
// Auth: https://developers.google.com/identity/protocols/oauth2/service-account

import { JWT } from "google-auth-library";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchConsoleQueryOptions {
  siteUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dimensions?: Array<"date" | "query" | "page" | "country" | "device">;
  rowLimit?: number;
}

export interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleResult {
  siteUrl: string;
  rows: SearchConsoleRow[];
}

// ─── Token cache (module-level, survives across requests in same process) ──────

let _jwtClient: JWT | null = null;

function getJwtClient(): JWT {
  if (_jwtClient) return _jwtClient;

  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "[search-console] GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and " +
        "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY must be set in .env.local.\n" +
        "See src/lib/services/search-console.ts for setup instructions.",
    );
  }

  // Environment variables often store newlines as literal \n — unescape them.
  const normalizedKey = privateKey.replace(/\\n/g, "\n");

  _jwtClient = new JWT({
    email: clientEmail,
    key: normalizedKey,
    scopes: [SEARCH_CONSOLE_SCOPE],
  });

  return _jwtClient;
}

// ─── getAccessToken ───────────────────────────────────────────────────────────

/**
 * Returns a valid OAuth2 access token for the Search Console API.
 * google-auth-library handles caching and refresh automatically.
 */
async function getAccessToken(): Promise<string> {
  const client = getJwtClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("[search-console] Failed to obtain access token from Google.");
  }

  return tokenResponse.token;
}

// ─── querySearchConsole ───────────────────────────────────────────────────────

/**
 * Fetch search analytics data from Google Search Console.
 *
 * @param options.siteUrl    Verified site URL (e.g. "https://example.com/" or "sc-domain:example.com")
 * @param options.startDate  Start of reporting range (YYYY-MM-DD)
 * @param options.endDate    End of reporting range (YYYY-MM-DD)
 * @param options.dimensions Breakdown dimensions (default: ["date"])
 * @param options.rowLimit   Max rows returned (default: 25, max: 25000)
 */
export async function querySearchConsole(
  options: SearchConsoleQueryOptions,
): Promise<SearchConsoleResult> {
  const { siteUrl, startDate, endDate, dimensions = ["date"], rowLimit = 25 } = options;

  const accessToken = await getAccessToken();

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[search-console] API request failed: ${response.status} ${response.statusText}. ${body}`,
    );
  }

  const data = (await response.json()) as { rows?: SearchConsoleRow[] };

  return {
    siteUrl,
    rows: data.rows ?? [],
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Fetch last 28 days of top queries for a site.
 * Sorted by clicks descending (API default).
 */
export async function getTopQueries(
  siteUrl: string,
  rowLimit = 100,
): Promise<SearchConsoleRow[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 28);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const result = await querySearchConsole({
    siteUrl,
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    dimensions: ["query"],
    rowLimit,
  });

  return result.rows;
}

/**
 * Fetch last 28 days of performance data grouped by date.
 * Useful for trend charts (clicks / impressions over time).
 */
export async function getDailyPerformance(
  siteUrl: string,
): Promise<SearchConsoleRow[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 28);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const result = await querySearchConsole({
    siteUrl,
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    dimensions: ["date"],
    rowLimit: 28,
  });

  return result.rows;
}
