"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Globe,
  Bell,
  Settings,
  Zap,
  ShieldCheck,
  Activity,
  Search,
  Sparkles,
  Link2,
  ChevronRight,
  Gauge,
  FileDown,
  Building2,
  Plus,
  TrendingUp,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"

const globalNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
]

const globalTools = [
  { title: "Alerts",   href: "/dashboard/alerts",   icon: Bell },
  { title: "Uptime",   href: "/dashboard/uptime",   icon: Activity },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

const projectCoreNav = [
  { title: "Overview",          suffix: "",          icon: Gauge },
  { title: "Search Visibility", suffix: "/seo",      icon: Search },
  { title: "Rankings",          suffix: "/rankings", icon: TrendingUp },
  { title: "Animation",         suffix: "/animation", icon: Sparkles },
  { title: "Reports",           suffix: "/report",   icon: FileDown },
  { title: "Settings",          suffix: "/settings", icon: Settings },
]

const projectHealthNav = [
  { title: "Pages",        suffix: "/pages",    icon: Globe },
  { title: "Security",     suffix: "/security", icon: ShieldCheck },
  { title: "Broken Links", suffix: "/links",    icon: Link2 },
  { title: "Uptime",       suffix: "/uptime",   icon: Activity },
]

const projectExtensionNav = [
  { title: "Local SEO", suffix: "/gbp", icon: Building2 },
]

interface AppSidebarProps {
  user: {
    name: string
    email: string
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  const projectMatch = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/)
  const projectId = projectMatch?.[1]
  const nonProjectSegments = new Set(["alerts", "uptime", "settings", "security", "new"])
  const inProject = projectId && !nonProjectSegments.has(projectId)

  return (
    <Sidebar collapsible="icon">
      {/* ── Header / Logo ────────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                {/* Logo mark with glow */}
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg transition-all duration-300"
                  style={{
                    background: "oklch(0.65 0.22 258)",
                    boxShadow: "0 0 12px oklch(0.65 0.22 258 / 50%)",
                  }}
                >
                  <Zap className="size-4 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold tracking-tight">SiteLens</span>
                  <span className="truncate text-xs opacity-50">Audit Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Global navigation ────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest opacity-40">
            Overview
          </SidebarGroupLabel>
          <SidebarMenu>
            {globalNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* ── Per-project sub-navigation ───────────────────────── */}
        {inProject && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-1 text-xs uppercase tracking-widest opacity-40">
                <ChevronRight className="size-3" />
                Project
              </SidebarGroupLabel>
              <SidebarMenu>
                {projectCoreNav.map((item) => {
                  const href = `/dashboard/${projectId}${item.suffix}`
                  const isActive = item.suffix === ""
                    ? pathname === href || pathname === `/dashboard/${projectId}`
                    : pathname.startsWith(href)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-widest opacity-40">
                Website Health
              </SidebarGroupLabel>
              <SidebarMenu>
                {projectHealthNav.map((item) => {
                  const href = `/dashboard/${projectId}${item.suffix}`
                  const isActive = pathname.startsWith(href)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-widest opacity-40">
                Extensions
              </SidebarGroupLabel>
              <SidebarMenu>
                {projectExtensionNav.map((item) => {
                  const href = `/dashboard/${projectId}${item.suffix}`
                  const isActive = pathname.startsWith(href)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}

        {/* ── Global tools ─────────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest opacity-40">
            Tools
          </SidebarGroupLabel>
          <SidebarMenu>
            {globalTools.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* ── Add project (pinned to bottom) ───────────────────── */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Add Project"
                className="font-medium"
              >
                <Link href="/dashboard/new">
                  <Plus className="size-4" />
                  <span>Add Project</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
