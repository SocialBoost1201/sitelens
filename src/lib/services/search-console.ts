// Google Search Console API service — SiteLens
// SCAFFOLD — not yet fully implemented.
//
// Prerequisites before activating:
//   1. Create a Google Cloud service account with Search Console access
//   2. Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY in .env.local
//   3. Grant the service account "Restricted" or "Full" access in Search Console
//   4. Enable the "Google Search Console API" in your Google Cloud project
//
// NOTE: This service uses a service-account (server-to-server) auth pattern.
// End-user OAuth (delegated access) is NOT implemented yet — that will require
// a full OAuth 2.0 flow and is deferred to a future phase.
//
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query

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

/**
 * Fetch search analytics data from Google Search Console.
 *
 * SCAFFOLD — JWT signing and OAuth token refresh are not yet implemented.
 * This function is a typed stub to establish the service interface.
 * Implement `getAccessToken()` below before calling this in production.
 */
export async function querySearchConsole(
  options: SearchConsoleQueryOptions,
): Promise<SearchConsoleResult> {
  const { siteUrl, startDate, endDate, dimensions = ["date"], rowLimit = 25 } =
    options;

  const accessToken = await getAccessToken();

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `[search-console] API request failed: ${response.status} ${response.statusText}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = await response.json();

  return {
    siteUrl,
    rows: (data.rows ?? []) as SearchConsoleRow[],
  };
}

// ---------------------------------------------------------------------------
// Internal — JWT / service-account token handling
// SCAFFOLD: implement proper JWT signing before using in production.
// ---------------------------------------------------------------------------

/**
 * Obtain a Google OAuth access token via service-account JWT.
 *
 * SCAFFOLD — this function is not yet implemented.
 * To implement: sign a JWT with the service-account private key, exchange it
 * for a short-lived access token via the Google token endpoint.
 * See: https://developers.google.com/identity/protocols/oauth2/service-account
 */
async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "[search-console] GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and " +
        "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY must be set in .env.local.",
    );
  }

  // TODO: Implement JWT signing and token exchange.
  // Recommended library: `google-auth-library` (npm install google-auth-library)
  throw new Error(
    "[search-console] getAccessToken() is not yet implemented. " +
      "See the TODO comment in src/lib/services/search-console.ts.",
  );
}
