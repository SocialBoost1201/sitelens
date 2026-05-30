import { db } from "@/lib/db/client"
import { getValidAccessToken } from "@/lib/gbp/auth"
import type { GoogleIntegration } from "@/generated/prisma/client"

const ACCOUNT_LIST_ENDPOINT =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
const BUSINESS_INFORMATION_API_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1"

type GoogleAccountListResponse = {
  accounts?: Array<{
    name: string
    accountName?: string
  }>
  nextPageToken?: string
}

type GoogleLocationListResponse = {
  locations?: Array<{
    name: string
    title?: string
  }>
  nextPageToken?: string
}

export type GbpAccount = {
  name: string
  displayName: string
}

export type GbpLocationSummary = {
  accountName: string
  accountDisplayName: string
  googleLocationId: string
  title: string
}

export type GbpLocationListResult = {
  accounts: GbpAccount[]
  locations: GbpLocationSummary[]
}

async function fetchGoogleJson<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `[gbp] Google API request failed: ${response.status} ${response.statusText}. ${body}`,
    )
  }

  return response.json() as Promise<T>
}

function extractGoogleResourceId(resourceName: string): string {
  return resourceName.split("/").pop() ?? resourceName
}

export async function listGbpAccounts(accessToken: string): Promise<GbpAccount[]> {
  const accounts: GbpAccount[] = []
  let pageToken: string | undefined

  do {
    const endpoint = new URL(ACCOUNT_LIST_ENDPOINT)
    endpoint.searchParams.set("pageSize", "100")
    if (pageToken) endpoint.searchParams.set("pageToken", pageToken)

    const payload = await fetchGoogleJson<GoogleAccountListResponse>(
      endpoint,
      accessToken,
    )

    for (const account of payload.accounts ?? []) {
      accounts.push({
        name: account.name,
        displayName: account.accountName ?? extractGoogleResourceId(account.name),
      })
    }

    pageToken = payload.nextPageToken
  } while (pageToken)

  return accounts
}

export async function listGbpLocations(
  integration: GoogleIntegration,
): Promise<GbpLocationListResult> {
  const accessToken = await getValidAccessToken(integration)
  const accounts = await listGbpAccounts(accessToken)
  const locations: GbpLocationSummary[] = []

  for (const account of accounts) {
    let pageToken: string | undefined

    do {
      const endpoint = new URL(
        `${BUSINESS_INFORMATION_API_BASE}/${account.name}/locations`,
      )
      endpoint.searchParams.set("pageSize", "100")
      endpoint.searchParams.set("readMask", "name,title")
      if (pageToken) endpoint.searchParams.set("pageToken", pageToken)

      const payload = await fetchGoogleJson<GoogleLocationListResponse>(
        endpoint,
        accessToken,
      )

      for (const location of payload.locations ?? []) {
        const googleLocationId = extractGoogleResourceId(location.name)
        locations.push({
          accountName: account.name,
          accountDisplayName: account.displayName,
          googleLocationId,
          title: location.title ?? googleLocationId,
        })
      }

      pageToken = payload.nextPageToken
    } while (pageToken)
  }

  return { accounts, locations }
}

export async function syncGbpLocations(
  googleIntegrationId: string,
  locations: GbpLocationSummary[],
): Promise<void> {
  for (const location of locations) {
    await db.gbpLocation.upsert({
      where: {
        googleLocationId: location.googleLocationId,
      },
      update: {
        googleIntegrationId,
        title: location.title,
      },
      create: {
        googleIntegrationId,
        googleLocationId: location.googleLocationId,
        title: location.title,
      },
    })
  }

  const googleLocationIds = locations.map((location) => location.googleLocationId)

  await db.gbpLocation.deleteMany({
    where: {
      googleIntegrationId,
      ...(googleLocationIds.length > 0
        ? {
            googleLocationId: {
              notIn: googleLocationIds,
            },
          }
        : {}),
    },
  })
}
