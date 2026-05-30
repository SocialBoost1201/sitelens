"use client"

import { useEffect, useRef, useState } from "react"
import { Gauge, BarChart2, Eye, ShieldCheck, type LucideIcon } from "lucide-react"
t
interface ScoreRingProps {
  value: number | undefined
  label: string
  icon: string
}
const ICON_MAP: Record<string, LucideIcon> = {
  performance: Gauge,
  seo: BarChart2,
  accessibility: Eye,
  "best-practices": ShieldCheck,
}
/** ease-out curve: t → 1 - (1-t)^3 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function ScoreRing({ value, label, icon }: ScoreRingProps) {
  const Icon = ICON_MAP[icon] ?? Gauge
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const DURATION = 1200 // ms — design-spec P0
  const started = value !== undefined

  // Count-up animation on mount
  useEffect(() => {
    if (value === undefined) return

    const target = Math.round(value)
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      const current = Math.round(easeOut(progress) * target)
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  const final = value !== undefined ? Math.round(value) : null

  const color =
    final === null
      ? "oklch(0.35 0.010 265)"
      : final >= 90
      ? "oklch(0.627 0.194 145)"
      : final >= 50
      ? "oklch(0.769 0.188 70)"
      : "oklch(0.628 0.258 29)"

  const bgColor =
    final === null
      ? "oklch(1 0 0 / 3%)"
      : final >= 90
      ? "oklch(0.627 0.194 145 / 10%)"
      : final >= 50
      ? "oklch(0.769 0.188 70 / 10%)"
      : "oklch(0.628 0.258 29 / 10%)"

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl p-4 transition-colors"
      style={{
        background: started ? bgColor : "oklch(1 0 0 / 3%)",
        border: `1px solid ${started ? color + "20" : "oklch(1 0 0 / 5%)"}`,
        transition: `background var(--duration-standard, 300ms) var(--ease-standard),
                     border-color var(--duration-standard, 300ms) var(--ease-standard)`,
      }}
    >
      <Icon className="size-4 transition-colors" style={{ color: started ? color : "oklch(0.35 0.010 265)" }} />
      <span
        className="text-3xl font-bold tabular-nums tracking-tighter transition-colors"
        style={{ color: started ? color : "oklch(0.35 0.010 265)" }}
      >
        {final !== null ? display : "—"}
      </span>
      <span
        className="text-[10px] font-medium uppercase tracking-widest"
        style={{ color: "oklch(0.55 0.010 265)" }}
      >
        {label}
      </span>
    </div>
  )
}
