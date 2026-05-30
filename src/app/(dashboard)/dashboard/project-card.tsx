"use client"

import Link from "next/link"
import { Globe, ArrowRight, BarChart2, ShieldCheck, Activity, Gauge } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

const scoreCategories = [
  { icon: Gauge,       label: "Perf" },
  { icon: BarChart2,   label: "SEO"  },
  { icon: ShieldCheck, label: "Sec"  },
  { icon: Activity,    label: "Up"   },
]

interface ProjectCardProps {
  project: {
    id: string
    name: string
    url: string
    createdAt: string
  }
  latestRun?: {
    id: string
    status: string
    createdAt: string
  }
  index: number
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    COMPLETED: { bg: "oklch(0.627 0.194 145 / 10%)", color: "oklch(0.627 0.194 145)", label: "Completed" },
    RUNNING:   { bg: "oklch(0.65 0.22 258 / 10%)",  color: "oklch(0.65 0.22 258)",  label: "Running"   },
    PENDING:   { bg: "oklch(0.769 0.188 70 / 10%)", color: "oklch(0.769 0.188 70)", label: "Pending"   },
    FAILED:    { bg: "oklch(0.628 0.258 29 / 10%)", color: "oklch(0.628 0.258 29)", label: "Failed"    },
  }
  const s = map[status] ?? { bg: "oklch(1 0 0 / 5%)", color: "oklch(0.52 0.012 265)", label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function ProjectCard({ project, latestRun, index }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      key={project.id}
      href={`/dashboard/${project.id}`}
      className="group block animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="relative h-full rounded-xl p-5 transition-all duration-300 group-hover:scale-[1.01] group-hover:-translate-y-0.5"
        style={{
          background: "oklch(0.13 0.006 265)",
          border: hovered
            ? "1px solid oklch(0.65 0.22 258 / 40%)"
            : "1px solid oklch(1 0 0 / 7%)",
          boxShadow: hovered
            ? "0 8px 32px oklch(0 0 0 / 30%), 0 0 0 1px oklch(0.65 0.22 258 / 10%)"
            : "0 4px 24px oklch(0 0 0 / 20%)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Project header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105"
              style={{
                background: "oklch(0.65 0.22 258 / 12%)",
                border: "1px solid oklch(0.65 0.22 258 / 20%)",
              }}
            >
              <Globe className="size-4" style={{ color: "oklch(0.65 0.22 258)" }} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm tracking-tight">{project.name}</p>
              <p className="truncate text-xs mt-0.5" style={{ color: "oklch(0.50 0.010 265)" }}>
                {project.url}
              </p>
            </div>
          </div>
          <ArrowRight
            className="size-4 shrink-0 mt-0.5 transition-all duration-300 group-hover:translate-x-0.5"
            style={{ color: "oklch(0.40 0.010 265)" }}
          />
        </div>

        {/* Score categories row */}
        <div className="flex gap-2 mb-4">
          {scoreCategories.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-2"
              style={{ background: "oklch(0.10 0.008 265)" }}
            >
              <Icon className="size-3.5" style={{ color: "oklch(0.42 0.010 265)" }} />
              <span className="text-[10px] font-medium" style={{ color: "oklch(0.42 0.010 265)" }}>
                {label}
              </span>
              <span className="text-xs font-bold" style={{ color: "oklch(0.55 0.012 265)" }}>
                —
              </span>
            </div>
          ))}
        </div>

        {/* Status + date */}
        <div className="flex items-center justify-between">
          {latestRun ? (
            <StatusDot status={latestRun.status} />
          ) : (
            <Badge
              variant="outline"
              className="text-xs"
              style={{ color: "oklch(0.42 0.010 265)", borderColor: "oklch(1 0 0 / 10%)" }}
            >
              No audits yet
            </Badge>
          )}
          {latestRun && (
            <span className="text-xs" style={{ color: "oklch(0.42 0.010 265)" }}>
              {new Date(latestRun.createdAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
