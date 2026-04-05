// Supabase server client — use in Server Components, Route Handlers, and Server Actions.
// Reads cookies via Next.js `cookies()` for session propagation.
//
// Usage:
//   import { createClient } from "@/lib/supabase/server";
//   const supabase = await createClient();

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` is called from a Server Component — cookies cannot be
            // mutated there. The middleware must handle session refresh instead.
            // See: src/middleware.ts
          }
        },
      },
    },
  );
}
