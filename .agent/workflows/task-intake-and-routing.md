# Task Intake and Routing — SiteLens

> 対象: Antigravity / Codex / Claude Code
> 更新: 2026-04-14

---

## ワークフロー概要

新規タスクを受け取ったとき、このワークフローに従ってルーティングを決定する。

---

## Step 1: タスク分類

| 種別 | 判断基準 | 担当 |
|---|---|---|
| **設計・構成・方針** | UI設計・アーキテクチャ決定・ドキュメント | Antigravity |
| **実装・コード変更** | ファイル編集・diff生成・リファクタ | Codex |
| **分析・監査** | 横断レビュー・品質確認・深堀り調査 | Claude Code |
| **複合タスク** | 設計+実装が混在 | Antigravity → Codex の分担 |

---

## Step 2: スコープ確認

```
[ ] 問題・ゴールが明確か
[ ] スコアリングロジックへの影響がないか
[ ] データ解釈・評価しきい値への変更がないか
[ ] このリポジトリのスコープ内か
```

いずれかが NO の場合 → **即時停止してユーザーに確認**

---

## Step 3: 実行フロー

```
Analysis → Plan → Approval → Execution → Verification
```

---

## Step 4: 完了報告テンプレート

```markdown
## 完了報告

### 変更ファイル

### diff

### 検証
- コマンド: `npm run lint && npm run build`
- 結果: PASS / FAIL

### docs/ 更新
- （アーキテクチャ変更時は必須）
```

---

## SiteLens 固有チェックポイント

- アーキテクチャ変更時は `docs/` を必ず更新
- `docs/00_index/Doc-00_DocumentIndex_v1.0.md` を最新状態に保つ
- 新機能は Foundation/Setup フェーズの承認後のみ実装
- Prisma migration: 必ず承認後に実施
- Playwright テスト: UI 変更時に必ず実行
