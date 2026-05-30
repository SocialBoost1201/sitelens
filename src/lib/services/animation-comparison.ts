import type {
  AnimationAnalysisResult,
  AnimationEntry,
  AnimationSource,
  AnimationTrigger,
} from "@/lib/services/animation-analyzer"

export interface AnimationComparisonSummary {
  hasPrevious: boolean
  totalDelta: number
  gpuDelta: number
  nonCompositedDelta: number
  loopDelta: number
  newlyDetectedCount: number
  removedCount: number
  newRiskCount: number
  triggerDelta: Record<AnimationTrigger, number>
  sourceDelta: Record<AnimationSource, number>
}

export function compareAnimationResults(
  latest: AnimationAnalysisResult,
  previous: AnimationAnalysisResult | null,
): AnimationComparisonSummary {
  const emptyTriggerDelta: Record<AnimationTrigger, number> = {
    load: 0,
    hover: 0,
    scroll: 0,
    click: 0,
    focus: 0,
    loop: 0,
    unknown: 0,
  }
  const emptySourceDelta: Record<AnimationSource, number> = {
    "css-animation": 0,
    "css-transition": 0,
    scripted: 0,
  }

  if (!previous) {
    return {
      hasPrevious: false,
      totalDelta: 0,
      gpuDelta: 0,
      nonCompositedDelta: 0,
      loopDelta: 0,
      newlyDetectedCount: latest.animations.length,
      removedCount: 0,
      newRiskCount: latest.animations.filter(isRiskyAnimation).length,
      triggerDelta: emptyTriggerDelta,
      sourceDelta: emptySourceDelta,
    }
  }

  const latestMap = new Map(latest.animations.map((entry) => [entryKey(entry), entry]))
  const previousMap = new Map(previous.animations.map((entry) => [entryKey(entry), entry]))
  const newlyDetected = [...latestMap.keys()].filter((key) => !previousMap.has(key))
  const removed = [...previousMap.keys()].filter((key) => !latestMap.has(key))

  return {
    hasPrevious: true,
    totalDelta: latest.totalCount - previous.totalCount,
    gpuDelta: latest.gpuComposited - previous.gpuComposited,
    nonCompositedDelta: latest.nonComposited - previous.nonComposited,
    loopDelta: latest.loopCount - previous.loopCount,
    newlyDetectedCount: newlyDetected.length,
    removedCount: removed.length,
    newRiskCount: newlyDetected
      .map((key) => latestMap.get(key))
      .filter((entry): entry is AnimationEntry => Boolean(entry))
      .filter(isRiskyAnimation)
      .length,
    triggerDelta: diffEnumMap(latest.triggerSummary, previous.triggerSummary, emptyTriggerDelta),
    sourceDelta: diffEnumMap(latest.sourceSummary, previous.sourceSummary, emptySourceDelta),
  }
}

export function isRiskyAnimation(entry: AnimationEntry) {
  return (
    !entry.gpuComposited ||
    entry.loop ||
    entry.properties.some((property) =>
      ["width", "height", "top", "left", "right", "bottom"].includes(property) ||
      property.includes("margin") ||
      property.includes("padding") ||
      property === "filter" ||
      property === "backdrop-filter"
    )
  )
}

function entryKey(entry: AnimationEntry) {
  return [
    entry.element,
    entry.trigger,
    entry.source,
    [...entry.properties].sort().join("|"),
  ].join("::")
}

function diffEnumMap<T extends Record<string, number>>(
  latest: Partial<T>,
  previous: Partial<T>,
  seed: T,
): T {
  const result = { ...seed } as T
  for (const key of Object.keys(seed) as Array<keyof T>) {
    result[key] = ((latest[key] ?? 0) - (previous[key] ?? 0)) as T[keyof T]
  }
  return result
}
