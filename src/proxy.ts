// Next.js 16 Proxy — SiteLens
// Docs: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
//
// Responsibilities:
//   1. Session refresh — call supabase.auth.getUser() on every request so
//      that expired Supabase tokens are silently refreshed via cookie.
//   2. Auth redirect — unauthenticated users accessing protected routes
//      (anything under /dashboard) are redirected to /sign-in.
//
// Important (from Next.js 16 docs):
//   "Always verify authentication and authorization inside each Server
//   Function rather than relying on Proxy alone."
//   Proxy is a first-pass guard; each Server Component / Route Handler
//   must independently verify the session.
//
// Public routes (no auth required):
//   /             — landing page
//   /sign-in      — sign-in page
//   /sign-up      — sign-up page
//   /auth/*       — auth callback routes (OAuth, magic links)
//   /api/cron/*   — internal cron endpoints (protected by CRON_SECRET, not by session)

import { type NextRequest, NextResponse } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

/** Routes that do NOT require an authenticated session. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createProxyClient(request);

  // IMPORTANT: Do not run any code between createProxyClient() and getUser()
  // that could cause the session cookie to be consumed before refresh.
  // See: https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated user trying to access the auth pages → redirect to dashboard.
  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user trying to access a protected route → redirect to sign-in.
  if (!user && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve the intended destination so we can redirect back after login.
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // All other cases: return the (potentially cookie-refreshed) response.
  return response;
}

export const config = {
  matcher: [
    // Run proxy on all routes EXCEPT Next.js internals and static assets.
    // Note: _next/data routes are still covered even if listed here.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
