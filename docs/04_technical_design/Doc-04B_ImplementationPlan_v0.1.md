# Doc-04B: Implementation Plan

**Project**: SiteLens
**Version**: 0.1
**Status**: DRAFT
**Last Updated**: 2026-05-11

---

## 1. 開発アプローチ: Micro-SaaS MVP Speed Run

SiteLensはインディーハッカー的な「Micro-SaaS Launcher」の原則に従い、肥大化を避けて最速で収益化・価値検証可能なMVP（Minimum Viable Product）を構築します。
最初のバージョン（MVP）は **2週間でのリリース（Launch Ready）** を目標とします。

### 1.1 スタック (Solo-Founder Optimized)
*   **Frontend / Backend API**: Next.js 16 (App Router)
*   **Database & Auth**: Supabase (PostgreSQL + Supabase Auth)
*   **ORM**: Prisma
*   **Payments**: Stripe (サブスクリプション管理)
*   **Hosting**: Vercel

### 1.2 マイルストーン
*   **Week 1 (Core)**:
    *   Day 1-2: Supabase Authの設定と認証UIの実装、データベースの初期マイグレーション。
    *   Day 3-4: コア機能の実装（1プロジェクト1URLに対するPageSpeed Insights (PSI) 監査のトリガーと結果保存）。
    *   Day 5-6: Stripe連携とサブスクリプショントリガーの実装。
    *   Day 7: バグフィックスとコア機能のポリッシュ。
*   **Week 2 (Launch Ready)**:
    *   Day 1-2: LP（ランディングページ）の構築（Doc-02C のデザインシステム適用）。
    *   Day 3: オンボーディングおよびトランザクションメールのフロー構築。
    *   Day 4: 法的ページ（利用規約、プライバシーポリシー）の準備。
    *   Day 5-7: 最終結合テストとソフトローンチ。

> **MVPのスコープ制約**: 複雑な権限管理画面や複数URLの一括監査（V1へ延期済）、カスタムアラートの高度な設定UIはMVPに含めず、まずは単一のPSI診断結果と改善提案ダッシュボードを提供することに集中します。

---

## 2. アーキテクチャ: SaaS Multi-Tenant データモデリング

SiteLensは、複数顧客が同一データベースを共有する「Shared-schema」マルチテナントアーキテクチャを採用します（想定顧客数1000以下に最適化）。

### 2.1 テナントの定義と分離 (Tenant Boundary)
*   テナント境界のソース・オブ・トゥルースは `Project` モデルです。
*   `AuditRun`, `Metric`, `Finding`, `AlertRule`, `AlertViolation` など、プロジェクトに紐づくすべてのデータモデルは `projectId` をテナントIDとして保持します（リレーションで定義済）。

### 2.2 データベースレベルの保護 (PostgreSQL RLS)
アプリケーション側のバグによるデータ漏洩を完全に防ぐため、Supabase（PostgreSQL）の **Row-Level Security (RLS)** を強制します。
*   `ProjectMember` テーブルを介し、`auth.uid()`（ログインユーザー）がアクセス権（OWNER, ANALYST, VIEWER）を持つ `Project` のデータのみを SELECT / INSERT / UPDATE / DELETE できるポリシーを作成します（詳細は Doc-06 参照）。
*   RLSにより、万が一Prismaクエリで `where: { projectId }` が漏れても他テナントのデータは読み書きされません。

### 2.3 アプリケーションレベルでのスコープ適用 (Prisma Middleware/Extension)
RLSに加えて、アプリケーションレイヤーでも「常にテナントをスコープする」防御的実装を行います。
*   Prismaの Client Extension または Middleware を用い、テナントスコープ対象のテーブルに対して自動的に `where: { projectId: currentTenantId }` を付与する仕組みを実装します。
*   開発者が生の `findMany()` を叩いた際も、自動的にコンテキストからテナントIDが注入されるようにします。

### 2.4 バックグラウンドジョブと管理者ルート
*   **Cron/Queue Job**: n8nやVercel Cronなどのバックグラウンドタスクが監査を実行する際は、ペイロードに必ず `projectId` を含め、処理コンテキストにテナントIDを明示的にセットして実行します。
*   **管理者集計**: システム全体の指標（テナント横断集計）を扱うAdmin向けAPIは、通常のテナントJWT（セッション）とは分離し、Admin専用のロールまたはAPIキーを用いてRLSをバイパスします（テナントユーザーによるアクセスを遮断）。

---

## 3. 実装上の「Sharp Edges（落とし穴）」対策

1.  **オンボーディングの離脱 (Churn Prevention)**:
    *   登録直後に「最初のサイト（URL）を登録する」という明確なアクションを促すフローをUI/UXに組み込みます。
    *   価値（Aha moment）を最初のセッションで提供するため、登録完了直後に初回監査をバックグラウンドでキックし、即座にダッシュボードに数値を表示させます。
2.  **価格ページの混乱 (Simple Pricing)**:
    *   MVPではフリーミアムを設けず、無料トライアル（例: 7日間）＋ シンプルな1 Tier（Pro版）の構成とし、 Stripe Checkoutへの遷移を最短にします。
3.  **UIコンポーネントの肥大化**:
    *   Doc-02C のデザインルールに基づき、デザインの共通トークン（カラー、シャドウ、タイポグラフィ）をTailwind設定ファイル（`tailwind.config.ts` またはv4の設定）に先行して定義します。
    *   再利用可能なUIパーツは shadcn/ui をベースにしつつ、Radix UIプリミティブを用いて Antigravity デザインへとカスタマイズしてから使用します。
