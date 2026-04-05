// Supabase admin client — service role (bypasses RLS).
//
// USE THIS CLIENT ONLY in the audit pipeline and other system-level server
// operations that must write data outside the authenticated user's RLS scope.
//
// NEVER use this client in:
//   - Route Handlers that receive arbitrary user input
//   - Client Components or any browser-side code
//   - Any context where a regular authenticated client would suffice
//
// Required env var: SUPABASE_SERVICE_ROLE_KEY
//   Get it from: Supabase Dashboard → Project Settings → API → service_role
//
// The service role key is NEVER sent to the browser. It must live only in
// server-side environment variables (.env.local, Vercel env settings).

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _adminClient: ReturnType<typeof createSupabaseClient<Database>> | null =
  null;

export function createAdminClient(): ReturnType<
  typeof createSupabaseClient<Database>
> {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL is not set.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Get it from: Supabase Dashboard → Project Settings → API → service_role. " +
        "Add it to .env.local (server-side only — never expose to the browser).",
    );
  }

  _adminClient = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      // Disable session persistence — the admin client is stateless.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _adminClient;
}
