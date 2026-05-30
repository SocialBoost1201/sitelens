# Doc-02C: Design System & UI/UX Guidelines

**Project**: SiteLens
**Version**: 0.1
**Status**: DRAFT
**Last Updated**: 2026-05-11

---

## 1. Design Philosophy: "Antigravity & Luxury Futurism"

SiteLens 採用のフロントエンドデザインは、従来のSaaSに見られる汎用的でフラットなUI（テンプレ感）を脱却し、**「Antigravity（無重力感）」** と **「Luxury Futurism（高級感ある近未来）」** をテーマとします。

### 1.1 空間的奥行きと無重力感 (Spatial Depth & Weightlessness)
*   **Diffusion Shadows**: 強く濃い影ではなく、広範囲に拡散する柔らかい影（例: `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]`）を使用し、要素が「浮遊」している感覚を演出します。
*   **Liquid Glass (屈折エフェクト)**: 単なる `backdrop-blur` だけでなく、内側の1pxボーダー（`border-white/10`）とインナーシャドウを組み合わせ、物理的なガラスの屈折を再現します。
*   **Isometric Perspectives**: データ集計や比較ダッシュボードでは、CSS 3D Transform (`rotateX`, `rotateY`, `perspective`) を用い、アイソメトリック（等角投影）な空間配置をアクセントとして取り入れます。

### 1.2 配色とタイポグラフィ (Color & Typography)
*   **Color Calibration (脱・汎用AIカラー)**:
    *   ベースカラーは完全なニュートラル（Zinc / Slate / Charcoal）で統一。
    *   アクセントカラーは「1色のみ」に制限し、彩度を80%以下に抑えた上品な色（Electric Blue, Emerald, Deep Rose など）を使用。
    *   ライトモードでは視認性を確保するため、テキストに `#0F172A` (slate-900) 、ボーダーに `border-gray-200` を使用します。
*   **Deterministic Typography**:
    *   見出し (Display/H1-H3): `Geist`, `Satoshi`, `Cabinet Grotesk` のいずれかの高級感あるサンセリフ体を使用。(`Inter` は汎用化を避けるため禁止)。
    *   データ・数値: モノスペースフォント（`Geist Mono` 等）を適用し、桁揃えとプロ感を演出。
*   **アイコン (Anti-Emoji Policy)**:
    *   システム内のアイコンは **絵文字を一切禁止** します。
    *   必ず `@phosphor-icons/react` または `@radix-ui/react-icons` の高品質なSVGを利用し、`strokeWidth` (1.5 または 2.0) を統一します。

---

## 2. Layout & Interaction Rules

### 2.1 脱・中央揃えバイアス (Anti-Center Bias)
ヒーローセクションや主要なコンテンツブロックにおいて、無闇に中央揃え（Centered）にせず、**アシンメトリー（非対称）レイアウト**や、**Bento Grid（タイル型）**を積極的に採用します。画面分割（Split Screen）を用いて、情報とビジュアルのコントラストを高めます。

### 2.2 アニメーションとモーション (Perpetual Motion)
*   **モーション強度 (6/10)**: 静的すぎず、かつ過剰すぎない「シネマティック」な物理演算ベースのモーション。
*   **Spring Physics**: 線形（Linear）なトランジションを避け、重みと弾力性を感じるスプリング物理演算（`type: "spring", stiffness: 100, damping: 20`）を標準とします。
*   **Staggered Reveals**: リストやカード群のロード時は同時に表示せず、CSSの遅延やFramer Motionの `staggerChildren` を使用して順次表示（ウォーターフォール）させます。
*   **Tactile Feedback**: クリック可能な要素は `:active` 時に `-translate-y-[1px]` や `scale-[0.98]` となる触覚的なフィードバックを必須とします。

### 2.3 UI実装の境界 (RSC vs Client Components)
*   上記の高度なインタラクション（Framer Motion, Liquid Glass等）を含むUI要素は、必ず **独立した Client Component (`'use client'`)** に切り出します。
*   Server Components は、静的なレイアウトとデータフェッチに専念し、パフォーマンスの低下（モバイルでの描画カクつき）を防ぎます。
*   ビューポートの安定性のため、全画面要素には `h-screen` ではなく `min-h-[100dvh]` を必ず使用します。

---

## 3. UI/UX Pro Max 基準

### 3.1 アクセシビリティ (CRITICAL)
1.  **コントラスト比**: 通常テキストにおいて最低 `4.5:1` のコントラスト比を確保。
2.  **フォーカスリング**: キーボード操作時のフォーカス状態（`focus-visible`）を明瞭に表示。
3.  **Aria-Labels**: アイコンのみのボタンには必ず `aria-label` を付与。

### 3.2 タッチ操作とインタラクション (CRITICAL)
1.  **タッチターゲット**: モバイル環境を考慮し、クリック可能な要素は最低 `44x44px` の領域を確保。
2.  **カーソル**: 全てのインタラクティブ要素に `cursor-pointer` を付与。
3.  **フォーム**: `label` の `htmlFor` と input の `id` を必ず紐付け。

### 3.3 状態管理 (States)
AIが生成しがちな「常に成功した状態」だけでなく、以下の状態を美しく設計・実装します。
1.  **Loading**: 汎用スピナーを避け、レイアウトサイズに合わせたスケルトンローダーを使用。
2.  **Empty**: データがない状態での「次のアクション」を促す美しい空状態（Empty State）の提示。
3.  **Error**: フォームの入力エラーなどは、該当箇所の直下にインラインで明瞭に表示。非同期処理中はボタンを `disabled` にし、二重送信を防止。

---

> **適用プロセス**: 新規コンポーネントやページを作成する際は、必ず本ドキュメントの基準（Typography, Colors, Shadow, Motion, Accessibility）に準拠しているかレビューを実施してください。
