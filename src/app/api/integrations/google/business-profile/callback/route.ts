import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { listGbpLocations, syncGbpLocations } from "@/lib/gbp/locations"

const OAUTH_STATE_COOKIE = "gbp_oauth_state"

type OauthStateCookie = {
  projectId: string
  state: string
  userId: string
}

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  refresh_token?: string
}

function decodeStateCookie(value: string): OauthStateCookie | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OauthStateCookie
  } catch {
    return null
  }
}

function redirectToProjectPage(request: NextRequest, projectId: string, status?: string) {
  const destination = new URL(
    `/dashboard/${projectId}/gbp/locations`,
    request.url,
  )

  if (status) {
    destination.searchParams.set("status", status)
  }

  const response = NextResponse.redirect(destination)
  response.cookies.delete(OAUTH_STATE_COOKIE)
  return response
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth environment variables are not configured")
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => "")
    throw new Error(
      `[gbp] Token exchange failed: ${response.status} ${response.statusText}. ${payload}`,
    )
  }

  return response.json() as Promise<GoogleTokenResponse>
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const state = url.searchParams.get("state")
  const code = url.searchParams.get("code")
  const cookieValue = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  const cookieState = cookieValue ? decodeStateCookie(cookieValue) : null

  if (!cookieState || !state || !code || cookieState.state !== state) {
    return NextResponse.redirect(new URL("/dashboard?status=gbp_state_invalid", request.url))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== cookieState.userId) {
    return redirectToProjectPage(request, cookieState.projectId, "gbp_auth_required")
  }

  const project = await db.project.findUnique({
    where: { id: cookieState.projectId },
    select: { id: true, userId: true },
  })

  if (!project || project.userId !== user.id) {
    return redirectToProjectPage(request, cookieState.projectId, "gbp_forbidden")
  }

  try {
    const tokenPayload = await exchangeCodeForTokens(code)

    if (!tokenPayload.access_token) {
      throw new Error("Google token response did not include an access token")
    }

    const existingIntegration = await db.googleIntegration.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    const expiryDate = tokenPayload.expires_in
      ? new Date(Date.now() + tokenPayload.expires_in * 1000)
      : null

    const integration = existingIntegration
      ? await db.googleIntegration.update({
          where: { id: existingIntegration.id },
          data: {
            accessToken: tokenPayload.access_token,
            refreshToken:
              tokenPayload.refresh_token ?? existingIntegration.refreshToken,
            expiryDate,
          },
        })
      : await db.googleIntegration.create({
          data: {
            userId: user.id,
            accessToken: tokenPayload.access_token,
            refreshToken: tokenPayload.refresh_token ?? null,
            expiryDate,
          },
        })

    const gbpData = await listGbpLocations(integration)
    await syncGbpLocations(integration.id, gbpData.locations)

    return redirectToProjectPage(request, cookieState.projectId, "gbp_connected")
  } catch (error) {
    console.error("[gbp/callback]", error)
    return redirectToProjectPage(request, cookieState.projectId, "gbp_sync_failed")
  }
}
