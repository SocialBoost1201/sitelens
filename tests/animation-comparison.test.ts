import assert from "node:assert/strict"
import test from "node:test"
import { compareAnimationResults } from "../src/lib/services/animation-comparison.ts"
import type { AnimationAnalysisResult } from "../src/lib/services/animation-analyzer.ts"

function createResult(overrides: Partial<AnimationAnalysisResult>): AnimationAnalysisResult {
  return {
    url: "https://example.com",
    analyzedAt: "2026-04-13T00:00:00.000Z",
    animations: [],
    globalEasingProfile: {},
    performanceRisk: {
      nonCompositedCount: 0,
      layoutThrashRisk: false,
      heavyBlurCount: 0,
    },
    reducedMotion: false,
    totalCount: 0,
    gpuComposited: 0,
    nonComposited: 0,
    loopCount: 0,
    clsRisk: false,
    triggerSummary: {
      load: 0,
      hover: 0,
      scroll: 0,
      click: 0,
      focus: 0,
      loop: 0,
      unknown: 0,
    },
    scenarioCoverage: {
      load: false,
      hover: false,
      scroll: false,
      click: false,
      focus: false,
    },
    sourceSummary: {
      "css-animation": 0,
      "css-transition": 0,
      scripted: 0,
    },
    ...overrides,
  }
}

test("compareAnimationResults calculates deltas and new risks", () => {
  const previous = createResult({
    totalCount: 2,
    gpuComposited: 2,
    nonComposited: 0,
    loopCount: 0,
    triggerSummary: {
      load: 1,
      hover: 1,
      scroll: 0,
      click: 0,
      focus: 0,
      loop: 0,
      unknown: 0,
    },
    sourceSummary: {
      "css-animation": 1,
      "css-transition": 1,
      scripted: 0,
    },
    animations: [
      {
        element: "div.hero",
        trigger: "load",
        properties: ["opacity", "transform"],
        durationMs: 400,
        easing: "ease",
        loop: false,
        gpuComposited: true,
        willChange: "auto",
        libraryHint: "css",
        source: "css-animation",
        observed: true,
        keyframes: ["hero-in"],
        detectionMode: "web-animations-api",
      },
      {
        element: "button.cta",
        trigger: "hover",
        properties: ["opacity", "transform"],
        durationMs: 220,
        easing: "ease",
        loop: false,
        gpuComposited: true,
        willChange: "auto",
        libraryHint: "css",
        source: "css-transition",
        observed: true,
        keyframes: [],
        detectionMode: "style-diff",
      },
    ],
  })

  const latest = createResult({
    totalCount: 3,
    gpuComposited: 2,
    nonComposited: 1,
    loopCount: 1,
    triggerSummary: {
      load: 1,
      hover: 1,
      scroll: 0,
      click: 1,
      focus: 0,
      loop: 1,
      unknown: 0,
    },
    sourceSummary: {
      "css-animation": 1,
      "css-transition": 1,
      scripted: 1,
    },
    animations: [
      ...previous.animations,
      {
        element: "div.modal",
        trigger: "click",
        properties: ["width", "opacity"],
        durationMs: 260,
        easing: "ease-out",
        loop: true,
        gpuComposited: false,
        willChange: "width",
        libraryHint: "unknown",
        source: "scripted",
        observed: true,
        keyframes: [],
        detectionMode: "web-animations-api",
      },
    ],
  })

  const summary = compareAnimationResults(latest, previous)

  assert.equal(summary.hasPrevious, true)
  assert.equal(summary.totalDelta, 1)
  assert.equal(summary.gpuDelta, 0)
  assert.equal(summary.nonCompositedDelta, 1)
  assert.equal(summary.loopDelta, 1)
  assert.equal(summary.newlyDetectedCount, 1)
  assert.equal(summary.removedCount, 0)
  assert.equal(summary.newRiskCount, 1)
  assert.equal(summary.triggerDelta.click, 1)
  assert.equal(summary.sourceDelta.scripted, 1)
})
