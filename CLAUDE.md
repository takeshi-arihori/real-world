# プロジェクト概要

React 19 + TypeScript / Laravel 13 のモノレポ。AI駆動開発（ハーネスエンジニアリング）の学習・実践プロジェクト。

## ディレクトリ構成

- `frontend/` — React 19 + TypeScript 5.9 + Vite 8
- `backend/`  — Laravel 13 + PHP 8.4
- `.claude/rules/` — コーディング規約（詳細ルール）
- `.claude/skills/` — Claude Code スキル
- `specs/`        — Issue単位の設計メモ・実行プラン（gitignored）
- `docs/adr/`    — アーキテクチャ決定記録
- `docs/arch/`   — ドメイン設計・Bounded Context・ユビキタス言語
- `docs/design/` — 機能設計テンプレート

## ルール参照（作業開始前に確認）

| ファイル | 読むタイミング |
|---------|--------------|
| `.claude/rules/security.md` | **常に確認** |
| `.claude/rules/frontend.md` | `frontend/` 変更時 |
| `.claude/rules/backend.md`  | `backend/` 変更時 |
| `.claude/rules/git-flow.md` | コミット・PR作成時 |
| `.claude/rules/db.md`       | マイグレーション作成時 |
| `.claude/rules/log.md`      | ログ追加時 |

## 開発フロー

Issue → `specs/<feature>.md` 作成 → タスク分解 → TDD実装 → PR

- Git Flow: `feature/#<issue>-<slug>`
- TDD: Red → Green → Refactor
- 1 Issue = 1 PR, squash merge
- 設計ドキュメント作成をスキップしない

## ADR・設計ドキュメント

- アーキテクチャ決定 → `docs/adr/`（不変原則・ステータス明示）
- ドメイン設計 → `docs/arch/`
- 機能設計書 → `specs/<feature>.md`（テンプレート: `docs/design/_template-feature-spec.md`）

## Docker・テストコマンド

詳細は `README.md` を参照。

```bash
docker compose exec backend-php bash    # PHPコンテナ接続
cd frontend && pnpm vitest run          # FEテスト
cd backend && php artisan test          # BEテスト
```

## セキュリティ制約（絶対禁止）

- `.env` ファイルの編集・コミット禁止
- シークレット・APIキーのハードコーディング禁止
- `eval()`, `exec()`, `shell_exec()` の使用禁止
