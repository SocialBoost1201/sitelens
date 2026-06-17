"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export interface RankTrendPoint {
  date: string
  /** Organic position; null = not found in tracked depth (renders as a gap). */
  position: number | null
}

export function RankTrendChart({ data }: { data: RankTrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
        Not enough history yet — trends appear after a few fetches.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          reversed
          allowDecimals={false}
          domain={[1, "dataMax"]}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          formatter={(value) => {
            const v = typeof value === "number" ? value : null
            return [v == null ? "Not ranked" : `#${v}`, "Position"]
          }}
        />
        <Line
          type="monotone"
          dataKey="position"
          name="Position"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
