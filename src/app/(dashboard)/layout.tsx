// Dashboard route group layout — SiteLens
//
// Responsibilities:
//   1. Server-side auth guard: verify session independently of the proxy.
//   2. Render the app shell: dark sidebar + main content area.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Search, Command } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const displayName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={{ name: displayName, email: user.email ?? "" }} />
        <SidebarInset>
          {/* ── Top bar ──────────────────────────────────────────── */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4"
            style={{ borderColor: "oklch(1 0 0 / 6%)" }}
          >
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 opacity-60 hover:opacity-100 transition-opacity" />
              <Separator orientation="vertical" className="mr-1 h-4 opacity-20" />
              <span className="text-sm font-medium opacity-50">SiteLens</span>
            </div>

            {/* Global search hint */}
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all duration-200 hover:opacity-80"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 8%)",
                color: "oklch(0.60 0.010 265)",
              }}
              aria-label="Search"
            >
              <Search className="size-3.5" />
              <span>Search…</span>
              <kbd
                className="flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10px]"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.50 0.010 265)",
                }}
              >
                <Command className="size-2.5" />
                K
              </kbd>
            </button>
          </header>

          {/* Page content */}
          <div className="flex flex-1 flex-col gap-4 p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
