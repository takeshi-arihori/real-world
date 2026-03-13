# プロジェクト概要

TypeScript + Vue 3 フロントエンド / Laravel 12 バックエンドのモノレポ構成。

## ディレクトリ構成

- `web/` - フロントエンド (Vue 3 + TypeScript 5 + Vite)
- `api/` - バックエンド (Laravel 12 + PHP 8.3)
- `rules/` - AIへの詳細な指示・コーディング規約・設計ルール
- `docs/` - 要件ごとの設計書・仕様書（要件に応じて追記する）
- `.claude/skills/` - Claude Codeスキル

## ルール参照

作業開始前に `rules/` 配下の該当ファイルを必ず確認すること。

- `rules/frontend.md` - フロントエンド開発ルール
- `rules/backend.md` - バックエンド開発ルール
- `rules/git-flow.md` - Git Flow・コミット・PR規約

## docs/ の運用

- 要件ごとに設計書・仕様書を `docs/` に配置する
- Issue対応時に関連ドキュメントがあれば参照すること

## 技術スタック

| レイヤー | 技術 | テスト | リント |
|---------|------|--------|-------|
| フロントエンド | Vue 3 + TS 5 + Vite | Vitest | ESLint |
| バックエンド | Laravel 12 + PHP 8.3 | Pest 4.4 | Pint |

## 開発フロー

- Git Flow ベース（`feature/#<issue>-<slug>`）
- TDD: Red → Green → Refactor
- 1 Issue = 1 PR, squash merge
