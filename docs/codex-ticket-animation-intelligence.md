# Animation Intelligence 実装チケット
## Codex 向け実装設計書 — Phase 3A + 3E（MVP スコープ）

**作成:** Antigravity
**対象:** Codex（実装担当）
**前提確認:** `npx prisma generate` 完了・Playwright インストール済み
**レビュー:** Claude Code（実装後）

---

## 概要

SiteLens が分析対象のウェブサイトに含まれる CSS アニメーション情報を自動抽出し、構造化された診断レポートとして表示する機能を実装する。

---

## スコープ（今回の実装範囲）

| チケット | 内容 | 必須 |
|---|---|---|
| 3A-2 | Playwright 抽出サービス実装 | YES |
| 3A-3 | API Route 実装（POST/GET） | YES |
| 3E-2 | 結果表示 UI ページ | YES |
| DB変更 | AnimationResult モデル追加 | YES |
| ナビ追加 | サイドバーに Animation リンク追加 | YES |

スコープ外（次フェーズ）: 録画キャプチャ（3B）、デザイントークン抽出（3C）、LLMコード生成（3D）

---

## 1. データモデル変更

### prisma/schema.prisma に追加するモデル

追加場所: SPECIALISED ANALYSIS RESULTS セクション（BrokenLink の直前）

```prisma
model AnimationResult {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  url        String
  analyzedAt DateTime @default(now())

  totalCount     Int     @default(0)
  gpuComposited  Int     @default(0)
  nonComposited  Int     @default(0)
  loopCount      Int     @default(0)
  reducedMotion  Boolean @default(false)
  clsRisk        Boolean @default(false)

  data Json @default("{}")

  @@index([projectId])
  @@index([projectId, analyzedAt])
}
```

Project モデルの末尾に追加:

```prisma
animationResults AnimationResult[]
```

### Supabase SQL マイグレーション

```sql
CREATE TABLE "AnimationResult" (
  "id"             TEXT NOT NULL,
  "projectId"      TEXT NOT NULL,
  "url"            TEXT NOT NULL,
  "analyzedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalCount"     INTEGER NOT NULL DEFAULT 0,
  "gpuComposited"  INTEGER NOT NULL DEFAULT 0,
  "nonComposited"  INTEGER NOT NULL DEFAULT 0,
  "loopCount"      INTEGER NOT NULL DEFAULT 0,
  "reducedMotion"  BOOLEAN NOT NULL DEFAULT false,
  "clsRisk"        BOOLEAN NOT NULL DEFAULT false,
  "data"           JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "AnimationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnimationResult_projectId_idx"
  ON "AnimationResult"("projectId");
CREATE INDEX "AnimationResult_projectId_analyzedAt_idx"
  ON "AnimationResult"("projectId", "analyzedAt");

ALTER TABLE "AnimationResult"
  ADD CONSTRAINT "AnimationResult_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnimationResult" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own animation results"
  ON "AnimationResult" FOR ALL
  USING (
    "projectId" IN (
      SELECT id FROM "Project" WHERE "userId" = auth.uid()::text
    )
  );
```

マイグレーション後: npx prisma generate

---

## 2. 抽出サービス実装

ファイル: src/lib/services/animation-analyzer.ts
参照パターン: src/lib/services/seo-analyzer.ts

```typescript
import { chromium } from "playwright"

export interface AnimationEntry {
  element: string
  trigger: "load" | "hover" | "scroll" | "loop" | "unknown"
  properties: string[]
  durationMs: number
  easing: string
  loop: boolean
  gpuComposited: boolean
  willChange: string
  libraryHint: "css" | "framer-motion" | "gsap" | "anime.js" | "unknown"
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
}

export async function analyzeAnimation(url: string): Promise<AnimationAnalysisResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 })
    await page.waitForTimeout(2000)

    const result = await page.evaluate(() => {
      const entries: any[] = []
      const GPU_SAFE = new Set(["opacity", "transform"])
      const LAYOUT_PROPS = new Set(["width", "height", "top", "left", "margin", "padding"])

      document.querySelectorAll("*").forEach((el) => {
        const style = getComputedStyle(el)
        const animName = style.animationName
        if (!animName || animName === "none") return

        const durationRaw = style.animationDuration
        const durationMs = parseFloat(durationRaw) * (durationRaw.endsWith("ms") ? 1 : 1000)
        const properties = ["transform", "opacity"]

        entries.push({
          element:
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : "") +
            (el.className ? `.${String(el.className).split(" ")[0]}` : ""),
          trigger: "load",
          properties,
          durationMs: isNaN(durationMs) ? 0 : durationMs,
          easing: style.animationTimingFunction || "ease",
          loop: style.animationIterationCount === "infinite",
          gpuComposited: properties.every((p) => GPU_SAFE.has(p)),
          willChange: style.willChange || "auto",
          libraryHint: "css",
        })
      })

      const hasFramer =
        !!(window as any).__FRAMER_MOTION_VERSION__ ||
        !!document.querySelector("[data-framer-appear-id]")
      if (hasFramer) entries.forEach((e) => { e.libraryHint = "framer-motion" })
      if (!!(window as any).gsap) entries.forEach((e) => { e.libraryHint = "gsap" })

      let reducedMotion = false
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (
                rule instanceof CSSMediaRule &&
                rule.conditionText.includes("prefers-reduced-motion")
              )
                reducedMotion = true
            }
          } catch {}
        }
      } catch {}

      const nonComposited = entries.filter((e) => !e.gpuComposited).length
      const layoutThrashRisk = entries.some((e) =>
        e.properties.some((p: string) => LAYOUT_PROPS.has(p))
      )
      const heavyBlurCount = entries.filter((e) =>
        e.properties.includes("filter") || e.properties.includes("backdrop-filter")
      ).length

      const easingFreq: Record<string, number> = {}
      entries.forEach((e) => {
        easingFreq[e.easing] = (easingFreq[e.easing] || 0) + 1
      })
      const sorted = Object.entries(easingFreq).sort((a, b) => b[1] - a[1])

      return {
        animations: entries.slice(0, 200),
        globalEasingProfile: {
          standard: sorted[0]?.[0],
          hover: sorted[1]?.[0],
          entry: sorted[2]?.[0],
        },
        performanceRisk: { nonCompositedCount: nonComposited, layoutThrashRisk, heavyBlurCount },
        reducedMotion,
        totalCount: entries.length,
        gpuComposited: entries.filter((e) => e.gpuComposited).length,
        nonComposited,
        loopCount: entries.filter((e) => e.loop).length,
        clsRisk: layoutThrashRisk,
      }
    })

    return { url, analyzedAt: new Date().toISOString(), ...result }
  } finally {
    await browser.close()
  }
}
```

---

## 3. API Route 実装

ファイル: src/app/api/projects/[projectId]/animation/route.ts
参照パターン: src/app/api/projects/[projectId]/seo/route.ts と同じ構造

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeAnimation } from "@/lib/services/animation-analyzer"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: project, error } = await supabase
    .from("Project").select("id, url").eq("id", projectId).single()
  if (error || !project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const targetUrl: string = body.url ?? project.url

  try {
    const result = await analyzeAnimation(targetUrl)
    const admin = createAdminClient()
    const id = crypto.randomUUID()

    await admin.from("AnimationResult").insert({
      id,
      projectId,
      url: targetUrl,
      analyzedAt: result.analyzedAt,
      totalCount: result.totalCount,
      gpuComposited: result.gpuComposited,
      nonComposited: result.nonComposited,
      loopCount: result.loopCount,
      reducedMotion: result.reducedMotion,
      clsRisk: result.clsRisk,
      data: result as unknown,
    })

    return NextResponse.json({ id, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Animation analysis failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("AnimationResult")
    .select(
      "id, url, analyzedAt, totalCount, gpuComposited, nonComposited, loopCount, reducedMotion, clsRisk, data"
    )
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
```

---

## 4. UI ページ仕様

ファイル: src/app/(dashboard)/dashboard/[projectId]/animation/page.tsx
参照パターン: src/app/(dashboard)/dashboard/[projectId]/seo/page.tsx に準拠

Server Component として実装。以下のセクションを含む:

```
1. ページヘッダー
   - タイトル: "Animation Analysis"
   - RunAnimationButton (Client Component)
   - 最終分析日時

2. サマリーカード x4（横並び）
   [Total Animations] [GPU Composited] [Non-Composited] [Loop Animations]
   GPU → emerald / Non-Composited → amber / Loop → neutral

3. 診断バッジ行
   - prefers-reduced-motion: 対応 / 未対応
   - CLS リスク: なし / あり

4. アニメーション一覧テーブル
   列: Element | Trigger | Duration | Easing | GPU | Loop | Library
   50件表示・overflow-x: auto

5. 過去の分析履歴（直近5件）
   日時・totalCount・GPU率

6. データなし → 空ステート
   "No animation analysis yet. Click Run Analysis to start."
```

RunAnimationButton ファイル: ./run-animation-button.tsx

```typescript
"use client"
// fetch POST /api/projects/[projectId]/animation
// ローディング中: Loader2 アイコン + "Analyzing..."
// 完了後: router.refresh()
// エラー時: console.error + alert
```

---

## 5. サイドバーへのナビゲーション追加

ファイル: src/components/layout/app-sidebar.tsx
追加箇所: ANALYSIS セクション内（SEO の直下）

```typescript
{
  title: "Animation",
  href: `/dashboard/${projectId}/animation`,
  icon: Sparkles,  // import { Sparkles } from "lucide-react"
}
```

---

## 6. 実装順序

```
Step 1: prisma/schema.prisma にモデル追加 + npx prisma generate
Step 2: Supabase SQL Editor でマイグレーション実行
Step 3: src/lib/services/animation-analyzer.ts 実装
Step 4: src/app/api/projects/[projectId]/animation/route.ts 実装
Step 5: run-animation-button.tsx (Client Component) 実装
Step 6: animation/page.tsx (UI) 実装
Step 7: app-sidebar.tsx にナビリンク追加
Step 8: npm run build でエラーなし確認
```

---

## 7. 検証条件（Claude Code レビュー対象）

- [ ] AnimationResult の RLS ポリシーが正しく機能する
- [ ] analyzeAnimation でブラウザが必ず close() される（try/finally）
- [ ] 未認証リクエストに 401 が返る
- [ ] Playwright タイムアウト時のエラーハンドリングが存在する
- [ ] data カラムへの JSON 格納が型エラーなし
- [ ] ページが Server Component として正常動作する

---

## 8. 依存パッケージ

```bash
# 確認
cat package.json | grep playwright

# 未インストールなら
npm install playwright
npx playwright install chromium
```

NOTE: Playwright を Vercel サーバーレス環境で本番利用する場合は
@vercel/playwright またはコンテナ環境が必要。
MVP フェーズはローカル (npm run dev) での動作確認のみで可。

---

## 参考ファイル

| ファイル | 参照理由 |
|---|---|
| src/app/api/projects/[projectId]/seo/route.ts | API Route パターン（ほぼ流用可） |
| src/lib/services/seo-analyzer.ts | サービス関数パターン |
| src/app/(dashboard)/dashboard/[projectId]/page.tsx | デザイントークン参照 |
| src/components/layout/app-sidebar.tsx | ナビ追加箇所 |
| prisma/schema.prisma | BrokenLink の直前にモデル追加 |
