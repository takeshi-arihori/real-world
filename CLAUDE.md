# プロジェクト概要

TypeScript + React 19 フロントエンド / Laravel 12 バックエンドのモノレポ構成。

## ディレクトリ構成

- `web/` - フロントエンド (React 19 + TypeScript 5.9 + Vite 8)
- `api/` - バックエンド (Laravel 12 + PHP 8.3)
- `rules/` - AIへの詳細な指示・コーディング規約・設計ルール
- `docs/` - 設計書・仕様書・ADR
- `.claude/skills/` - Claude Codeスキル

## ルール参照

作業開始前に `rules/` 配下の該当ファイルを必ず確認すること。

| ファイル | 内容 | 読むタイミング |
|---------|------|--------------|
| `rules/frontend.md` | フロントエンド開発ルール | `web/` 配下を変更するとき |
| `rules/backend.md` | バックエンド開発ルール | `api/` 配下を変更するとき |
| `rules/git-flow.md` | Git Flow・コミット・PR規約 | コミット・PR作成時 |
| `rules/db.md` | DB設計・マイグレーション規約 | テーブル・マイグレーション作成時 |
| `rules/log.md` | ログ運用ルール | ログ出力を追加するとき |
| `rules/security.md` | セキュリティルール | **常に確認** |

## docs/ の運用

- 要件ごとに設計書・仕様書を `docs/specs/` に配置する
  - テンプレート: `docs/specs/_template-feature-spec.md`
  - Issue 着手時にコピーして `docs/specs/<feature>.md` を作成する
- 設計判断の記録は `docs/adr/` に ADR として残す
- DB スキーマは `docs/dbschema.dbml` に DBML 形式で記録
- Issue対応時に関連ドキュメントがあれば参照すること

## 技術スタック

| レイヤー | 技術 | テスト | リント |
|---------|------|--------|-------|
| フロントエンド | React 19 + TS 5.9 + Vite 8 | Vitest + Testing Library | ESLint |
| バックエンド | Laravel 12 + PHP 8.3 | Pest 4.4 | Pint |

## 開発フロー

- Issue → 要件整理 → 設計ドキュメント → タスク分解 → TDD 実装 → PR
- 設計ステップをスキップしない（`docs/specs/<feature>.md` を作成してから実装に入る）
- Git Flow ベース（`feature/#<issue>-<slug>`）
- TDD: Red → Green → Refactor
- 1 Issue = 1 PR, squash merge

## Docker

```bash
docker compose up -d                     # 全サービス起動
docker compose down                      # 停止
docker compose exec api-php bash         # PHPコンテナ接続
```

## テスト・リント実行コマンド

### フロントエンド

```bash
cd web && pnpm vitest run           # テスト実行
cd web && pnpm eslint .             # リント実行
cd web && pnpm tsc -b --noEmit     # 型チェック
```

### バックエンド

```bash
cd api && php artisan test          # テスト実行
cd api && ./vendor/bin/pint --test  # リント確認
cd api && ./vendor/bin/phpstan analyse   # 静的解析
```

## セキュリティ制約（絶対禁止）

- `.env` ファイルの編集・コミット禁止
- シークレット・APIキーのハードコーディング禁止
- `eval()`, `exec()`, `shell_exec()` の使用禁止
- 詳細は `rules/security.md` を参照
