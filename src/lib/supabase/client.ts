// Supabase browser client — use in Client Components ("use client").
// Creates a singleton per page-load to avoid multiple GoTrue instances.
//
// Usage:
//   import { createClient } from "@/lib/supabase/client";
//   const supabase = createClient();

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
