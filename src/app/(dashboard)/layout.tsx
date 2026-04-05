// Dashboard route group layout — SiteLens
//
// Responsibilities:
//   1. Server-side auth guard: verify session independently of the proxy.
//      Next.js 16 docs warn: "Always verify authentication inside each Server
//      Function rather than relying on Proxy alone."
//   2. Render the application shell: navigation header + page content.
//
// All routes under (dashboard)/ inherit this layout. The route group prefix
// "(dashboard)" is stripped from the URL — routes are rendered at /dashboard/*.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser() is the correct call (not getSession()) — it validates the token
  // with the Supabase Auth server, not just the local cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <a
                href="/dashboard"
                className="text-base font-semibold text-gray-900 hover:text-gray-700"
              >
                SiteLens
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-500 sm:block">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
