// Supabase client for use in proxy.ts (Next.js 16 Proxy context).
//
// The regular server client (lib/supabase/server.ts) uses `next/headers`
// cookies(), which is only available in Server Components and Route Handlers.
// In proxy.ts, cookies must be read from the NextRequest and written to the
// NextResponse directly.
//
// This function follows the @supabase/ssr pattern for middleware/proxy:
// it creates a client that reads cookies from the request and writes any
// refreshed session cookies to the outgoing response.
//
// Usage (proxy.ts only):
//   const { supabase, response } = createProxyClient(request);
//   const { data: { user } } = await supabase.auth.getUser();
//   return response;

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export function createProxyClient(request: NextRequest) {
  // Start with a NextResponse.next() that we will return at the end.
  // Any session cookie refreshes are written onto this response object.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies to both the mutated request object
          // (so downstream Server Components see them) and to the response
          // (so the browser receives the updated session).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return { supabase, response: supabaseResponse };
}
