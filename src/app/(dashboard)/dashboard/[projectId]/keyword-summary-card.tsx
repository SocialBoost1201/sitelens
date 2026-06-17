// Keyword Trends summary card for the project overview (Doc-11 / BL-01, OQ-11-4).
//
// DISPLAY ONLY. This card surfaces keyword-rank signals next to Site Health, but
// rankings are NOT a scored axis: nothing here is added to or subtracted from the
// Site Health composite score. It reads its own data (RLS-scoped) and renders a
// link into the Rankings page.

import Link from "next/link"
import { TrendingUp, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

const CARD_BG = "oklch(0.13 0.006 265)"
const CARD_BORDER = "1px solid oklch(1 0 0 / 7%)"
const MUTED = "oklch(0.50 0.010 265)"
const ACCENT = "oklch(0.65 0.22 258)"
const TILE_BG = "oklch(0.11 0.007 265)"

export async function KeywordSummaryCard({ projectId }: { projectId: string }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("TrackedKeyword")
    .select("lastPosition, enabled")
    .eq("projectId", projectId)

  const keywords = data ?? []
  const tracked = keywords.length
  const ranked = keywords.filter((k) => k.lastPosition != null)
  const top10 = ranked.filter((k) => (k.lastPosition as number) <= 10).length
  const avg =
    ranked.length > 0
      ? Math.round(ranked.reduce((s, k) => s + (k.lastPosition as number), 0) / ranked.length)
      : null

  const base = `/dashboard/${projectId}`

  return (
    <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <TrendingUp className="size-3.5" style={{ color: ACCENT }} />
            Keyword Trends
          </h2>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {tracked > 0
              ? "Search-visibility signal — informational, not part of Site Health score"
              : "Track keywords to monitor your Google positions"}
          </p>
        </div>
        <Link
          href={`${base}/rankings`}
          className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: ACCENT }}
        >
          {tracked > 0 ? "View rankings" : "Add keywords"}
          <ChevronRight className="size-3" />
        </Link>
      </div>

      {tracked > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Tracked", value: String(tracked) },
            { label: "In top 10", value: String(top10) },
            { label: "Avg position", value: avg != null ? `#${avg}` : "—" },
          ].map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col gap-1 rounded-xl p-3"
              style={{ background: TILE_BG, border: CARD_BORDER }}
            >
              <span className="text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                {tile.label}
              </span>
              <span className="text-lg font-bold tabular-nums leading-none">{tile.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: MUTED }}>
          No keywords tracked yet.
        </p>
      )}
    </div>
  )
}
