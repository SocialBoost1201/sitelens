import { db } from "@/lib/db/client"
import type { GoogleIntegration } from "@/generated/prisma/client"

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const EXPIRY_BUFFER_MS = 60 * 1000

type GoogleRefreshTokenResponse = {
  access_token?: string
  expires_in?: number
  refresh_token?: string
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleRefreshTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured")
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to refresh Google Business Profile access token")
  }

  const payload = (await response.json()) as GoogleRefreshTokenResponse

  if (!payload.access_token) {
    throw new Error("Google token refresh response did not include an access token")
  }

  return payload
}

function isAccessTokenValid(expiryDate: Date | null): boolean {
  if (!expiryDate) return false
  return expiryDate.getTime() - EXPIRY_BUFFER_MS > Date.now()
}

export async function getValidAccessToken(
  integration: GoogleIntegration,
): Promise<string> {
  if (isAccessTokenValid(integration.expiryDate)) {
    return integration.accessToken
  }

  if (!integration.refreshToken) {
    throw new Error("Google Business Profile connection requires re-authentication")
  }

  const refreshed = await refreshAccessToken(integration.refreshToken)
  const expiryDate = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null

  const updatedIntegration = await db.googleIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? integration.refreshToken,
      expiryDate,
    },
  })

  return updatedIntegration.accessToken
}
