// Supabase Auth callback Route Handler.
//
// Supabase Auth redirects to this URL after:
//   - OAuth sign-in flows (not used at MVP, but wired for future use)
//   - Magic link sign-in (not used at MVP)
//   - Email confirmation after sign-up
//
// The handler exchanges a one-time `code` for a session and redirects
// the user to their intended destination (or /dashboard by default).
//
// This URL must be registered in Supabase Dashboard:
//   Authentication → URL Configuration → Redirect URLs
//   Value: https://<your-domain>/auth/callback

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is the URL the user was trying to reach before being redirected to auth.
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful exchange → redirect to intended destination.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Code exchange failed or no code present → redirect to sign-in with error.
  return NextResponse.redirect(
    `${origin}/sign-in?error=auth_callback_failed`,
  );
}
