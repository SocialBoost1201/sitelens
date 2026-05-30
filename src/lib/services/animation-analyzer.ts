import { chromium, type Page } from "playwright"

const ANALYSIS_ATTR = "data-sitelens-id"
const TRACKED_STYLE_PROPERTIES = [
  "opacity",
  "transform",
  "filter",
  "backdrop-filter",
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
] as const

const GPU_SAFE_PROPERTIES = new Set(["opacity", "transform"])
const LAYOUT_PROPERTIES = new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
])
const HEAVY_EFFECT_PROPERTIES = new Set(["filter", "backdrop-filter"])

export type AnimationTrigger = "load" | "hover" | "scroll" | "click" | "focus" | "loop" | "unknown"
export type AnimationLibraryHint = "css" | "framer-motion" | "gsap" | "anime.js" | "unknown"
export type AnimationSource = "css-animation" | "css-transition" | "scripted"
export type AnimationDetectionMode = "web-animations-api" | "style-diff" | "declared-fallback"

export interface AnimationEntry {
  element: string
  trigger: AnimationTrigger
  properties: string[]
  durationMs: number
  easing: string
  loop: boolean
  gpuComposited: boolean
  willChange: string
  libraryHint: AnimationLibraryHint
  source: AnimationSource
  observed: boolean
  keyframes: string[]
  detectionMode: AnimationDetectionMode
}

export interface AnimationAnalysisResult {
  url: string
  analyzedAt: string
  animations: AnimationEntry[]
  globalEasingProfile: { standard?: string; hover?: string; entry?: string }
  performanceRisk: {
    nonCompositedCount: number
    layoutThrashRisk: boolean
    heavyBlurCount: number
  }
  reducedMotion: boolean
  totalCount: number
  gpuComposited: number
  nonComposited: number
  loopCount: number
  clsRisk: boolean
  triggerSummary: Record<AnimationTrigger, number>
  scenarioCoverage: Record<Exclude<AnimationTrigger, "loop" | "unknown">, boolean>
  sourceSummary: Record<AnimationSource, number>
}

type BrowserElementSummary = {
  id: string
  element: string
  visible: boolean
  interactive: boolean
  focusable: boolean
  clickable: boolean
  animationNames: string[]
  keyframes: string[]
  declaredProperties: string[]
  declaredDurationMs: number
  declaredEasing: string
  loop: boolean
  willChange: string
  hasAnimationDeclaration: boolean
  hasTransitionDeclaration: boolean
  libraryHint: AnimationLibraryHint
  source: AnimationSource
}

type RuntimeAnimationSummary = {
  source: AnimationSource
  properties: string[]
  durationMs: number
  easing: string
  loop: boolean
  keyframes: string[]
}

type ElementSnapshot = {
  id: string
  styles: Record<string, string>
  width: number
  height: number
  runtimeAnimations: RuntimeAnimationSummary[]
}

type ScenarioCapture = {
  before: ElementSnapshot[]
  after: ElementSnapshot[]
}

type ScenarioName = Exclude<AnimationTrigger, "loop" | "unknown">

export async function analyzeAnimation(url: string): Promise<AnimationAnalysisResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await navigateForAnalysis(page, url)
    await annotateElements(page)

    const summaries = await collectElementSummaries(page)
    const summaryMap = new Map(summaries.map((summary) => [summary.id, summary]))

    const loadIds = summaries
      .filter((summary) => summary.visible && (summary.hasAnimationDeclaration || summary.hasTransitionDeclaration))
      .map((summary) => summary.id)

    const loadCapture = await captureScenario(page, loadIds, async () => {
      await page.waitForTimeout(450)
    })

    const hoverEntries = await captureHoverEntries(page, summaries, summaryMap)
    const scrollEntries = await captureScrollEntries(page, summaries, summaryMap)
    const clickEntries = await captureClickEntries(page, summaries, summaryMap)
    const focusEntries = await captureFocusEntries(page, summaries, summaryMap)

    const loadEntries = buildScenarioEntries({
      trigger: "load",
      ids: loadIds,
      capture: loadCapture,
      summaryMap,
      includeDeclaredFallback: true,
    })

    const mergedEntries = dedupeEntries([
      ...loadEntries,
      ...hoverEntries,
      ...scrollEntries,
      ...clickEntries,
      ...focusEntries,
    ]).slice(0, 200)

    const reducedMotion = await detectReducedMotionSupport(page)
    const nonComposited = mergedEntries.filter((entry) => !entry.gpuComposited).length
    const layoutThrashRisk = mergedEntries.some((entry) =>
      entry.properties.some((property) => LAYOUT_PROPERTIES.has(property))
    )
    const heavyBlurCount = mergedEntries.filter((entry) =>
      entry.properties.some((property) => HEAVY_EFFECT_PROPERTIES.has(property))
    ).length
    const easingFreq = Object.create(null) as Record<string, number>

    for (const entry of mergedEntries) {
      easingFreq[entry.easing] = (easingFreq[entry.easing] || 0) + 1
    }

    const sortedEasing = Object.entries(easingFreq).sort((a, b) => b[1] - a[1])
    const triggerSummary = createTriggerSummary(mergedEntries)
    const sourceSummary = createSourceSummary(mergedEntries)

    return {
      url,
      analyzedAt: new Date().toISOString(),
      animations: mergedEntries,
      globalEasingProfile: {
        standard: sortedEasing[0]?.[0],
        hover: sortedEasing[1]?.[0],
        entry: sortedEasing[2]?.[0],
      },
      performanceRisk: {
        nonCompositedCount: nonComposited,
        layoutThrashRisk,
        heavyBlurCount,
      },
      reducedMotion,
      totalCount: mergedEntries.length,
      gpuComposited: mergedEntries.filter((entry) => entry.gpuComposited).length,
      nonComposited,
      loopCount: mergedEntries.filter((entry) => entry.loop).length,
      clsRisk: layoutThrashRisk,
      triggerSummary,
      scenarioCoverage: {
        load: triggerSummary.load > 0,
        hover: triggerSummary.hover > 0,
        scroll: triggerSummary.scroll > 0,
        click: triggerSummary.click > 0,
        focus: triggerSummary.focus > 0,
      },
      sourceSummary,
    }
  } finally {
    await context.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

async function navigateForAnalysis(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Navigation failed"
    throw new Error(`Animation analysis failed to load ${url}: ${message}`)
  }

  await page.waitForTimeout(350)
}

async function annotateElements(page: Page) {
  await page.evaluate((attr) => {
    Array.from(document.querySelectorAll("*")).forEach((element, index) => {
      if (!element.getAttribute(attr)) {
        element.setAttribute(attr, `sl-${index + 1}`)
      }
    })
  }, ANALYSIS_ATTR)
}

async function collectElementSummaries(page: Page): Promise<BrowserElementSummary[]> {
  return page.evaluate(({ analysisAttr, trackedProperties }) => {
    const parseList = (value: string): string[] =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)

    const parseTime = (value: string): number => {
      const first = parseList(value)[0] ?? "0s"
      const numeric = Number.parseFloat(first)
      if (Number.isNaN(numeric)) return 0
      return first.endsWith("ms") ? numeric : numeric * 1000
    }

    const detectLibraryHint = (element: Element): AnimationLibraryHint => {
      const w = window as Window & {
        __FRAMER_MOTION_VERSION__?: string
        gsap?: unknown
        anime?: unknown
      }

      if (element.hasAttribute("data-framer-appear-id") || w.__FRAMER_MOTION_VERSION__) {
        return "framer-motion"
      }
      if (w.gsap) return "gsap"
      if (w.anime) return "anime.js"
      return "css"
    }

    const keyframePropertyMap = new Map<string, string[]>()

    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (rule instanceof CSSKeyframesRule) {
              const properties = new Set<string>()
              for (const frame of Array.from(rule.cssRules)) {
                if (!(frame instanceof CSSKeyframeRule)) continue
                for (const propertyName of Array.from(frame.style)) {
                  properties.add(propertyName)
                }
              }
              keyframePropertyMap.set(rule.name, Array.from(properties))
            }
          }
        } catch {
          // Ignore cross-origin stylesheet access failures.
        }
      }
    } catch {
      // Ignore stylesheet enumeration failures.
    }

    const isVisible = (style: CSSStyleDeclaration, rect: DOMRect) =>
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number.parseFloat(style.opacity || "1") > 0 &&
      rect.width > 0 &&
      rect.height > 0

    const isInteractive = (element: Element) =>
      element.matches("a, button, summary, [role='button'], input, select, textarea, [tabindex]")
    const isFocusable = (element: Element) =>
      element.matches("a[href], button, input, select, textarea, [tabindex], [contenteditable='true']")
    const isClickable = (element: Element) =>
      element.matches("button, a[href], summary, [role='button'], [onclick], [data-action], [data-click]")

    const getRuntimeAnimations = (element: Element): RuntimeAnimationSummary[] => {
      if (!("getAnimations" in element) || typeof element.getAnimations !== "function") {
        return []
      }

      return element.getAnimations({ subtree: false }).map((animation) => {
        const effect = animation.effect
        let properties: string[] = []
        let durationMs = 0
        let easing = "ease"
        let loop = false

        if (effect instanceof KeyframeEffect) {
          const keyframes = effect.getKeyframes()
          const propertyNames = new Set<string>()
          for (const keyframe of keyframes) {
            for (const key of Object.keys(keyframe)) {
              if (!["offset", "easing", "composite", "computedOffset"].includes(key)) {
                propertyNames.add(key)
              }
            }
          }
          properties = Array.from(propertyNames)

          const timing = effect.getComputedTiming()
          durationMs = typeof timing.duration === "number" ? timing.duration : 0
          easing = effect.getTiming().easing || "ease"
          loop = timing.iterations === Infinity
        }

        const animationName =
          animation instanceof CSSAnimation
            ? animation.animationName
            : null

        const source: AnimationSource =
          animation instanceof CSSAnimation
            ? "css-animation"
            : animation instanceof CSSTransition
              ? "css-transition"
              : "scripted"

        return {
          source,
          properties,
          durationMs,
          easing,
          loop,
          keyframes: animationName ? [animationName] : [],
        }
      })
    }

    return Array.from(document.querySelectorAll(`[${analysisAttr}]`))
      .map((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        const animationNames = parseList(style.animationName).filter((name) => name !== "none")
        const transitionProperties = parseList(style.transitionProperty).filter((name) => name !== "none")
        const keyframeProperties = animationNames.flatMap((name) => keyframePropertyMap.get(name) ?? [])
        const willChangeProperties = parseList(style.willChange).filter((name) => name !== "auto")
        const runtimeAnimations = getRuntimeAnimations(element)
        const declaredProperties = new Set<string>([
          ...keyframeProperties,
          ...willChangeProperties,
          ...transitionProperties.filter((name) => name !== "all"),
        ])

        if (declaredProperties.size === 0 && style.transform !== "none") declaredProperties.add("transform")
        if (declaredProperties.size === 0 && style.opacity !== "1") declaredProperties.add("opacity")
        if (declaredProperties.size === 0 && style.filter !== "none") declaredProperties.add("filter")
        if (declaredProperties.size === 0 && style.getPropertyValue("backdrop-filter") !== "none") {
          declaredProperties.add("backdrop-filter")
        }

        const hasAnimationDeclaration = animationNames.length > 0
        const hasTransitionDeclaration =
          parseTime(style.transitionDuration) > 0 ||
          runtimeAnimations.some((animation) => animation.source === "css-transition")

        const libraryHint = detectLibraryHint(element)
        const source: AnimationSource =
          hasAnimationDeclaration
            ? "css-animation"
            : hasTransitionDeclaration
              ? "css-transition"
              : libraryHint === "css"
                ? "scripted"
                : "scripted"

        return {
          id: element.getAttribute(analysisAttr) ?? "",
          element:
            element.tagName.toLowerCase() +
            (element.id ? `#${element.id}` : "") +
            ((element.getAttribute("class") || "")
              .trim()
              .split(/\s+/)
              .find(Boolean)
              ? `.${(element.getAttribute("class") || "")
                  .trim()
                  .split(/\s+/)
                  .find(Boolean)}`
              : ""),
          visible: isVisible(style, rect),
          interactive: isInteractive(element),
          focusable: isFocusable(element),
          clickable: isClickable(element),
          animationNames,
          keyframes: animationNames,
          declaredProperties: Array.from(declaredProperties).filter((property) =>
            trackedProperties.includes(property as (typeof trackedProperties)[number]) ||
            property === "transform" ||
            property === "opacity" ||
            property === "filter" ||
            property === "backdrop-filter"
          ),
          declaredDurationMs: hasAnimationDeclaration
            ? parseTime(style.animationDuration)
            : parseTime(style.transitionDuration),
          declaredEasing: hasAnimationDeclaration
            ? parseList(style.animationTimingFunction)[0] ?? "ease"
            : parseList(style.transitionTimingFunction)[0] ?? "ease",
          loop:
            parseList(style.animationIterationCount).some((value) => value === "infinite") ||
            runtimeAnimations.some((animation) => animation.loop),
          willChange: style.willChange || "auto",
          hasAnimationDeclaration,
          hasTransitionDeclaration,
          libraryHint,
          source,
        } satisfies BrowserElementSummary
      })
      .filter((summary) => summary.id)
  }, { analysisAttr: ANALYSIS_ATTR, trackedProperties: TRACKED_STYLE_PROPERTIES })
}

async function captureHoverEntries(
  page: Page,
  summaries: BrowserElementSummary[],
  summaryMap: Map<string, BrowserElementSummary>,
): Promise<AnimationEntry[]> {
  const candidates = summaries
    .filter((summary) => summary.visible && (summary.interactive || summary.hasTransitionDeclaration))
    .slice(0, 8)

  const entries: AnimationEntry[] = []

  for (const summary of candidates) {
    const subtreeIds = await collectSubtreeIds(page, summary.id)
    if (subtreeIds.length === 0) continue

    try {
      const capture = await captureScenario(page, subtreeIds, async () => {
        const locator = page.locator(`[${ANALYSIS_ATTR}="${summary.id}"]`).first()
        await locator.scrollIntoViewIfNeeded()
        await locator.hover({ force: true })
        await page.waitForTimeout(180)
      })

      entries.push(
        ...buildScenarioEntries({
          trigger: "hover",
          ids: subtreeIds,
          capture,
          summaryMap,
          includeDeclaredFallback: false,
        }),
      )
    } catch {
      // Ignore hover targets that cannot be interacted with.
    } finally {
      await page.mouse.move(0, 0).catch(() => undefined)
      await page.waitForTimeout(40)
    }
  }

  return entries
}

async function captureClickEntries(
  page: Page,
  summaries: BrowserElementSummary[],
  summaryMap: Map<string, BrowserElementSummary>,
): Promise<AnimationEntry[]> {
  const candidates = summaries
    .filter((summary) => summary.visible && (summary.clickable || summary.interactive))
    .slice(0, 8)

  const entries: AnimationEntry[] = []

  for (const summary of candidates) {
    const subtreeIds = await collectSubtreeIds(page, summary.id)
    if (subtreeIds.length === 0) continue

    try {
      const capture = await captureScenario(page, subtreeIds, async () => {
        await page.evaluate(
          ({ analysisAttr, id }) => {
            const target = document.querySelector(`[${analysisAttr}="${id}"]`)
            if (!(target instanceof HTMLElement)) return
            target.click()
          },
          { analysisAttr: ANALYSIS_ATTR, id: summary.id },
        )
        await page.waitForTimeout(220)
      })

      entries.push(
        ...buildScenarioEntries({
          trigger: "click",
          ids: subtreeIds,
          capture,
          summaryMap,
          includeDeclaredFallback: false,
        }),
      )
    } catch {
      // Ignore click targets that throw during synthetic activation.
    }
  }

  return entries
}

async function captureFocusEntries(
  page: Page,
  summaries: BrowserElementSummary[],
  summaryMap: Map<string, BrowserElementSummary>,
): Promise<AnimationEntry[]> {
  const candidates = summaries
    .filter((summary) => summary.visible && summary.focusable)
    .slice(0, 8)

  const entries: AnimationEntry[] = []

  for (const summary of candidates) {
    const subtreeIds = await collectSubtreeIds(page, summary.id)
    if (subtreeIds.length === 0) continue

    try {
      const capture = await captureScenario(page, subtreeIds, async () => {
        await page.evaluate(
          ({ analysisAttr, id }) => {
            const target = document.querySelector(`[${analysisAttr}="${id}"]`)
            if (target instanceof HTMLElement) {
              target.focus()
            }
          },
          { analysisAttr: ANALYSIS_ATTR, id: summary.id },
        )
        await page.waitForTimeout(180)
      })

      entries.push(
        ...buildScenarioEntries({
          trigger: "focus",
          ids: subtreeIds,
          capture,
          summaryMap,
          includeDeclaredFallback: false,
        }),
      )
    } catch {
      // Ignore focus targets that cannot receive focus.
    } finally {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }).catch(() => undefined)
    }
  }

  return entries
}

async function captureScrollEntries(
  page: Page,
  summaries: BrowserElementSummary[],
  summaryMap: Map<string, BrowserElementSummary>,
): Promise<AnimationEntry[]> {
  const candidateIds = summaries
    .filter((summary) => summary.hasAnimationDeclaration || summary.hasTransitionDeclaration)
    .map((summary) => summary.id)

  const scrollTargets = await page.evaluate(() => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    if (maxScroll <= 0) return [] as number[]

    return Array.from(new Set([
      Math.round(maxScroll * 0.25),
      Math.round(maxScroll * 0.55),
      Math.round(maxScroll * 0.85),
    ])).filter((value) => value > 0)
  })

  const entries: AnimationEntry[] = []

  for (const position of scrollTargets) {
    const capture = await captureScenario(page, candidateIds, async () => {
      await page.evaluate((top) => {
        window.scrollTo({ top, behavior: "auto" })
      }, position)
      await page.waitForTimeout(220)
    })

    entries.push(
      ...buildScenarioEntries({
        trigger: "scroll",
        ids: candidateIds,
        capture,
        summaryMap,
        includeDeclaredFallback: false,
      }),
    )
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" })).catch(() => undefined)

  return entries
}

async function collectSubtreeIds(page: Page, id: string): Promise<string[]> {
  return page.evaluate(
    ({ analysisAttr, id }) => {
      const root = document.querySelector(`[${analysisAttr}="${id}"]`)
      if (!root) return []

      return [
        root.getAttribute(analysisAttr) ?? "",
        ...Array.from(root.querySelectorAll(`[${analysisAttr}]`)).map((element) =>
          element.getAttribute(analysisAttr) ?? ""
        ),
      ].filter(Boolean)
    },
    { analysisAttr: ANALYSIS_ATTR, id },
  )
}

async function captureScenario(
  page: Page,
  ids: string[],
  action: () => Promise<void>,
): Promise<ScenarioCapture> {
  const before = await snapshotElements(page, ids)
  await action()
  const after = await snapshotElements(page, ids)

  return { before, after }
}

async function snapshotElements(page: Page, ids: string[]): Promise<ElementSnapshot[]> {
  if (ids.length === 0) return []

  return page.evaluate(
    ({ analysisAttr, ids, trackedProperties }) => {
      const getRuntimeAnimations = (element: Element): RuntimeAnimationSummary[] => {
        if (!("getAnimations" in element) || typeof element.getAnimations !== "function") {
          return []
        }

        return element.getAnimations({ subtree: false }).map((animation) => {
          const effect = animation.effect
          let properties: string[] = []
          let durationMs = 0
          let easing = "ease"
          let loop = false

          if (effect instanceof KeyframeEffect) {
            const keyframes = effect.getKeyframes()
            const propertyNames = new Set<string>()
            for (const keyframe of keyframes) {
              for (const key of Object.keys(keyframe)) {
                if (!["offset", "easing", "composite", "computedOffset"].includes(key)) {
                  propertyNames.add(key)
                }
              }
            }

            properties = Array.from(propertyNames)
            const timing = effect.getComputedTiming()
            durationMs = typeof timing.duration === "number" ? timing.duration : 0
            easing = effect.getTiming().easing || "ease"
            loop = timing.iterations === Infinity
          }

          const animationName =
            animation instanceof CSSAnimation
              ? animation.animationName
              : null

          return {
            source:
              animation instanceof CSSAnimation
                ? "css-animation"
                : animation instanceof CSSTransition
                  ? "css-transition"
                  : "scripted",
            properties,
            durationMs,
            easing,
            loop,
            keyframes: animationName ? [animationName] : [],
          } satisfies RuntimeAnimationSummary
        })
      }

      return ids
        .map((id) => {
          const element = document.querySelector(`[${analysisAttr}="${id}"]`)
          if (!element) return null

          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          const styles: Record<string, string> = {}

          for (const property of trackedProperties) {
            styles[property] = style.getPropertyValue(property)
          }

          return {
            id,
            styles,
            width: rect.width,
            height: rect.height,
            runtimeAnimations: getRuntimeAnimations(element),
          } satisfies ElementSnapshot
        })
        .filter((snapshot): snapshot is ElementSnapshot => snapshot !== null)
    },
    { analysisAttr: ANALYSIS_ATTR, ids, trackedProperties: TRACKED_STYLE_PROPERTIES },
  )
}

function buildScenarioEntries({
  trigger,
  ids,
  capture,
  summaryMap,
  includeDeclaredFallback,
}: {
  trigger: ScenarioName
  ids: string[]
  capture: ScenarioCapture
  summaryMap: Map<string, BrowserElementSummary>
  includeDeclaredFallback: boolean
}): AnimationEntry[] {
  const beforeMap = new Map(capture.before.map((snapshot) => [snapshot.id, snapshot]))
  const afterMap = new Map(capture.after.map((snapshot) => [snapshot.id, snapshot]))
  const entries: AnimationEntry[] = []

  for (const id of ids) {
    const summary = summaryMap.get(id)
    if (!summary) continue

    const before = beforeMap.get(id)
    const after = afterMap.get(id)
    const changedProperties = detectChangedProperties(before, after)
    const runtimeAnimations = after?.runtimeAnimations.length
      ? after.runtimeAnimations
      : before?.runtimeAnimations ?? []
    const runtimeProperties = runtimeAnimations.flatMap((animation) => animation.properties)
    const runtimeKeyframes = runtimeAnimations.flatMap((animation) => animation.keyframes)

    const properties = uniqueStrings([
      ...changedProperties,
      ...runtimeProperties,
      ...summary.declaredProperties,
    ])
    const hasObservedMotion = changedProperties.length > 0 || runtimeAnimations.length > 0

    if (!hasObservedMotion && !includeDeclaredFallback) {
      continue
    }

    const durationMs = runtimeAnimations[0]?.durationMs ?? summary.declaredDurationMs
    const easing = runtimeAnimations[0]?.easing ?? summary.declaredEasing
    const source = runtimeAnimations[0]?.source ?? summary.source
    const loop = runtimeAnimations.some((animation) => animation.loop) || summary.loop
    const effectiveTrigger: AnimationTrigger = loop && trigger === "load" ? "loop" : trigger
    const detectionMode: AnimationDetectionMode =
      runtimeAnimations.length > 0
        ? "web-animations-api"
        : changedProperties.length > 0
          ? "style-diff"
          : "declared-fallback"

    entries.push({
      element: summary.element,
      trigger: effectiveTrigger,
      properties: properties.length > 0 ? properties : ["unknown"],
      durationMs,
      easing,
      loop,
      gpuComposited: properties.length > 0 && properties.every((property) => GPU_SAFE_PROPERTIES.has(property)),
      willChange: summary.willChange,
      libraryHint: summary.libraryHint,
      source,
      observed: hasObservedMotion,
      keyframes: uniqueStrings([...summary.keyframes, ...runtimeKeyframes]),
      detectionMode,
    })
  }

  return entries
}

function detectChangedProperties(
  before: ElementSnapshot | undefined,
  after: ElementSnapshot | undefined,
): string[] {
  if (!before || !after) return []

  const changed = new Set<string>()

  for (const property of TRACKED_STYLE_PROPERTIES) {
    if ((before.styles[property] || "") !== (after.styles[property] || "")) {
      changed.add(property)
    }
  }

  if (Math.abs(before.width - after.width) > 0.5) changed.add("width")
  if (Math.abs(before.height - after.height) > 0.5) changed.add("height")

  return Array.from(changed)
}

function dedupeEntries(entries: AnimationEntry[]): AnimationEntry[] {
  const byKey = new Map<string, AnimationEntry>()

  for (const entry of entries) {
    const properties = uniqueStrings(entry.properties).sort()
    const key = [
      entry.element,
      entry.trigger,
      entry.source,
      properties.join("|"),
      entry.libraryHint,
    ].join("::")
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, { ...entry, properties })
      continue
    }

    byKey.set(key, {
      ...existing,
      durationMs: Math.max(existing.durationMs, entry.durationMs),
      easing: existing.easing !== "ease" ? existing.easing : entry.easing,
      loop: existing.loop || entry.loop,
      gpuComposited: existing.gpuComposited && entry.gpuComposited,
      willChange: existing.willChange !== "auto" ? existing.willChange : entry.willChange,
      observed: existing.observed || entry.observed,
      properties: uniqueStrings([...existing.properties, ...properties]),
      keyframes: uniqueStrings([...existing.keyframes, ...entry.keyframes]),
    })
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.trigger === b.trigger) return b.durationMs - a.durationMs
    return a.trigger.localeCompare(b.trigger)
  })
}

function createTriggerSummary(entries: AnimationEntry[]): Record<AnimationTrigger, number> {
  return entries.reduce<Record<AnimationTrigger, number>>(
    (acc, entry) => {
      acc[entry.trigger] += 1
      return acc
    },
    {
      load: 0,
      hover: 0,
      scroll: 0,
      click: 0,
      focus: 0,
      loop: 0,
      unknown: 0,
    },
  )
}

function createSourceSummary(entries: AnimationEntry[]): Record<AnimationSource, number> {
  return entries.reduce<Record<AnimationSource, number>>(
    (acc, entry) => {
      acc[entry.source] += 1
      return acc
    },
    {
      "css-animation": 0,
      "css-transition": 0,
      scripted: 0,
    },
  )
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

async function detectReducedMotionSupport(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (
              rule instanceof CSSMediaRule &&
              rule.conditionText.includes("prefers-reduced-motion")
            ) {
              return true
            }
          }
        } catch {
          // Ignore cross-origin stylesheet access failures.
        }
      }
    } catch {
      // Ignore stylesheet enumeration failures.
    }

    return false
  })
}
