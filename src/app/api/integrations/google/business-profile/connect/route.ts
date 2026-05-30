import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"

const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage"
const OAUTH_STATE_COOKIE = "gbp_oauth_state"

type OauthStateCookie = {
  projectId: string
  state: string
  userId: string
}

function encodeStateCookie(payload: OauthStateCookie): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (project.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 500 },
    )
  }

  const state = crypto.randomUUID()
  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  oauthUrl.searchParams.set("client_id", clientId)
  oauthUrl.searchParams.set("redirect_uri", redirectUri)
  oauthUrl.searchParams.set("response_type", "code")
  oauthUrl.searchParams.set("scope", GOOGLE_BUSINESS_SCOPE)
  oauthUrl.searchParams.set("access_type", "offline")
  oauthUrl.searchParams.set("prompt", "consent")
  oauthUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(oauthUrl)
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: encodeStateCookie({
      projectId,
      state,
      userId: user.id,
    }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  })

  return response
}
