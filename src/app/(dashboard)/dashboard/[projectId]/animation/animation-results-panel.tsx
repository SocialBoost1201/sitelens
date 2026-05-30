"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AnimationEntry, AnimationTrigger } from "@/lib/services/animation-analyzer"

const FILTER_ORDER: Array<AnimationTrigger | "all"> = [
  "all",
  "load",
  "hover",
  "scroll",
  "click",
  "focus",
  "loop",
  "unknown",
]

function BoolBadge({ value, yesLabel, noLabel }: { value: boolean; yesLabel: string; noLabel: string }) {
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
          : "border-muted bg-muted/40 text-muted-foreground"
      }
    >
      {value ? yesLabel : noLabel}
    </Badge>
  )
}

function SourceBadge({ source }: { source: AnimationEntry["source"] }) {
  const className =
    source === "css-animation"
      ? "border-blue-200 bg-blue-500/10 text-blue-600"
      : source === "css-transition"
        ? "border-emerald-200 bg-emerald-500/10 text-emerald-600"
        : "border-violet-200 bg-violet-500/10 text-violet-600"

  return <Badge variant="outline" className={className}>{source}</Badge>
}

export function AnimationResultsPanel({
  animations,
  analysisUrl,
}: {
  animations: AnimationEntry[]
  analysisUrl: string
}) {
  const [activeFilter, setActiveFilter] = useState<AnimationTrigger | "all">("all")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const availableFilters = FILTER_ORDER.filter((filter) =>
    filter === "all" || animations.some((entry) => entry.trigger === filter)
  )
  const filteredAnimations = animations.filter((entry) =>
    activeFilter === "all" ? true : entry.trigger === activeFilter
  )
  const selectedEntry =
    filteredAnimations.find((entry, index) => `${entry.element}-${entry.trigger}-${index}` === selectedKey) ??
    filteredAnimations[0] ??
    null

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Animation Inventory</CardTitle>
          <CardDescription>
            Interactive review of up to 50 entries detected for {analysisUrl}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {availableFilters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Element</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Observed</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>GPU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnimations.map((animation, index) => {
                const rowKey = `${animation.element}-${animation.trigger}-${index}`

                return (
                  <TableRow
                    key={rowKey}
                    className="cursor-pointer"
                    onClick={() => setSelectedKey(rowKey)}
                  >
                    <TableCell className="max-w-[240px] truncate font-mono text-xs">
                      {animation.element}
                    </TableCell>
                    <TableCell className="capitalize">{animation.trigger}</TableCell>
                    <TableCell><SourceBadge source={animation.source} /></TableCell>
                    <TableCell>
                      <BoolBadge value={animation.observed} yesLabel="Observed" noLabel="Declared" />
                    </TableCell>
                    <TableCell>{Math.round(animation.durationMs)} ms</TableCell>
                    <TableCell>
                      <BoolBadge value={animation.gpuComposited} yesLabel="Yes" noLabel="No" />
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredAnimations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No animation entries matched the selected trigger.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entry Detail</CardTitle>
          <CardDescription>
            Click a row to inspect detected properties and runtime evidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedEntry && (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Select an animation entry to inspect it.
            </div>
          )}

          {selectedEntry && (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs text-foreground">{selectedEntry.element}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{selectedEntry.trigger}</Badge>
                  <SourceBadge source={selectedEntry.source} />
                  <Badge variant="outline">{selectedEntry.detectionMode}</Badge>
                </div>
              </div>

              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-muted-foreground">Properties</p>
                <p className="mt-1 text-sm">{selectedEntry.properties.join(", ")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="mt-1 text-sm font-medium">{Math.round(selectedEntry.durationMs)} ms</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Easing</p>
                  <p className="mt-1 text-sm font-medium">{selectedEntry.easing}</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">will-change</p>
                  <p className="mt-1 text-sm font-medium">{selectedEntry.willChange}</p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">Library</p>
                  <p className="mt-1 text-sm font-medium">{selectedEntry.libraryHint}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <BoolBadge value={selectedEntry.observed} yesLabel="Observed" noLabel="Declared fallback" />
                <BoolBadge value={selectedEntry.gpuComposited} yesLabel="GPU composited" noLabel="Needs paint/layout review" />
                <BoolBadge value={selectedEntry.loop} yesLabel="Looping" noLabel="Finite" />
              </div>

              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-muted-foreground">Keyframes</p>
                <p className="mt-1 text-sm">
                  {selectedEntry.keyframes.length > 0 ? selectedEntry.keyframes.join(", ") : "No named keyframes detected"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
