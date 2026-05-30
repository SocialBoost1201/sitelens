import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { analyzeAnimation } from "../src/lib/services/animation-analyzer.ts"

const FIXTURE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Animation Fixture</title>
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
      }

      .hero {
        padding: 48px 24px;
        animation: hero-in 420ms ease-out forwards;
      }

      .hover-button {
        margin: 24px;
        padding: 16px 24px;
        border: none;
        background: #111827;
        color: white;
        cursor: pointer;
        transition: transform 220ms ease, opacity 220ms ease;
      }

      .hover-button:hover {
        transform: scale(1.08);
        opacity: 0.78;
      }

      .spacer {
        height: 1200px;
      }

      .scroll-card {
        margin: 0 24px 24px;
        padding: 24px;
        background: #e5f3ff;
        transform: translateY(40px);
        opacity: 0.4;
        transition: transform 280ms ease, opacity 280ms ease;
      }

      .scroll-card.is-visible {
        transform: translateY(0);
        opacity: 1;
      }

      .click-card {
        margin: 24px;
        padding: 24px;
        background: #fef3c7;
        transform: scale(1);
        opacity: 0.85;
      }

      .focus-input {
        margin: 24px;
        padding: 14px 16px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        transition: transform 180ms ease, opacity 180ms ease;
      }

      .focus-input:focus {
        transform: translateX(8px);
        opacity: 0.92;
      }

      @keyframes hero-in {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .hero,
        .hover-button,
        .scroll-card {
          animation-duration: 1ms;
          transition-duration: 1ms;
        }
      }
    </style>
  </head>
  <body>
    <section class="hero">
      <h1>Animation Fixture</h1>
      <p>Load animation should be detected.</p>
    </section>

    <button class="hover-button">Hover me</button>

    <div class="spacer"></div>

    <section class="scroll-card">
      <h2>Scroll target</h2>
      <p>Scroll-triggered transition should be detected.</p>
    </section>

    <div class="click-card" role="button" tabindex="0">Click target</div>

    <input class="focus-input" placeholder="Focus target" />

    <script>
      window.addEventListener("scroll", () => {
        const target = document.querySelector(".scroll-card");
        if (!target) return;
        if (window.scrollY > 300) {
          target.classList.add("is-visible");
        }
      });

      const clickCard = document.querySelector(".click-card");
      if (clickCard instanceof HTMLElement) {
        clickCard.addEventListener("click", () => {
          clickCard.animate(
            [
              { transform: "scale(1)", opacity: 0.85 },
              { transform: "scale(1.08)", opacity: 1 }
            ],
            { duration: 260, easing: "ease-out", fill: "forwards" }
          );
        });
      }
    </script>
  </body>
</html>`

test("analyzeAnimation captures load, hover, and scroll scenarios", async () => {
  const fixtureDir = await mkdtemp(join(tmpdir(), "sitelens-animation-"))
  const fixturePath = join(fixtureDir, "fixture.html")
  await writeFile(fixturePath, FIXTURE_HTML, "utf8")

  try {
    const result = await analyzeAnimation(pathToFileURL(fixturePath).href)

    assert.equal(result.reducedMotion, true)
    assert.ok(result.totalCount >= 3)
    assert.ok(result.triggerSummary.load >= 1)
    assert.ok(result.triggerSummary.hover >= 1)
    assert.ok(result.triggerSummary.scroll >= 1)
    assert.ok(result.triggerSummary.click >= 1)
    assert.ok(result.triggerSummary.focus >= 1)
    assert.ok(result.sourceSummary.scripted >= 1)

    const loadEntry = result.animations.find((entry) => entry.trigger === "load")
    assert.ok(loadEntry)
    assert.ok(loadEntry.properties.includes("opacity"))
    assert.ok(loadEntry.properties.includes("transform"))

    const hoverEntry = result.animations.find((entry) => entry.trigger === "hover")
    assert.ok(hoverEntry)
    assert.equal(hoverEntry.observed, true)
    assert.ok(hoverEntry.properties.includes("transform"))

    const scrollEntry = result.animations.find((entry) => entry.trigger === "scroll")
    assert.ok(scrollEntry)
    assert.equal(scrollEntry.observed, true)
    assert.ok(
      scrollEntry.properties.includes("transform") ||
      scrollEntry.properties.includes("opacity"),
    )

    const clickEntry = result.animations.find((entry) => entry.trigger === "click")
    assert.ok(clickEntry)
    assert.equal(clickEntry.observed, true)
    assert.equal(clickEntry.source, "scripted")

    const focusEntry = result.animations.find((entry) => entry.trigger === "focus")
    assert.ok(focusEntry)
    assert.equal(focusEntry.observed, true)
    assert.ok(focusEntry.properties.includes("transform"))
  } finally {
    await rm(fixtureDir, { recursive: true, force: true })
  }
})
