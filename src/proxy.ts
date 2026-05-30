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
//   /api/webhooks/* — provider webhooks (verified by route-specific secrets)
//   /share/*      — public report links
//   /invite/*     — invitation landing pages

import { type NextRequest, NextResponse } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

/** Routes that do NOT require an authenticated session. */
const AUTH_PAGE_PATHS = ["/sign-in", "/sign-up"];
const PUBLIC_EXACT_PATHS = ["/", ...AUTH_PAGE_PATHS];
const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/cron/",
  "/api/webhooks/",
  "/share/",
  "/invite/",
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PATHS.includes(pathname);
}

function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!hasSupabaseConfig()) {
    if (publicPath) return NextResponse.next();

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (publicPath && !isAuthPage(pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = createProxyClient(request);

  // IMPORTANT: Do not run any code between createProxyClient() and getUser()
  // that could cause the session cookie to be consumed before refresh.
  // See: https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated user trying to access the auth pages → redirect to dashboard.
  if (user && isAuthPage(pathname)) {
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
