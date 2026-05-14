# AI Harness Design

このプロジェクトの AI ハーネス設計の正本。`AGENTS.md` と `.agents/skills/*` は、この文書と `docs/rules/*` を参照する入口として扱う。

## 目的

- API、CRUD、新しい技術の学習を進めるため、AI の主な役割を実装補助だけでなくコードレビューに置く。
- レビューでは、テストが正しく仕様を検証しているか、アーキテクチャ境界が崩れていないかを優先する。
- エージェント固有の起動条件は各 coding agent の skill 仕様に従い、共通ルールは `docs/` に集約する。

## 正本の配置

- ハーネス設計: `docs/ai/harness.md`
- コーディングルール: `docs/rules/*.md`
- ドメイン設計: `docs/arch/*.md`
- 要件定義: `docs/requirements.md`
- 実装前設計メモテンプレート: `specs/_template-feature-spec.md`

ADR は廃止方向とし、判断は要件・ルール・ドメイン設計・ハーネス文書へ直接反映する。

## Entry Files

`AGENTS.md` には概要、正本への導線、skill の一覧だけを書く。詳細なチェックリストやコマンド列は置かない。

参考:

- https://openai.com/ja-JP/index/harness-engineering/
- https://developers.openai.com/codex/skills

## Skill Trigger Policy

- Repository skill は `.agents/skills/<skill-name>/SKILL.md` に置く。
- `SKILL.md` の frontmatter は `name` と `description` を必須にする。
- 暗黙起動は `description` に依存するため、用途とトリガー語を冒頭に書く。
- 本文には workflow だけを書き、詳細ルールは `docs/rules/*` を読むように指示する。

## Review-First Policy

`code-review` skill は次を優先して確認する。

- テストが仕様、失敗ケース、境界値、認可、バリデーションを検証しているか。
- Backend は `docs/rules/backend.md` の層分離を守っているか。
- Frontend は `docs/rules/frontend.md` の feature/shared/app/lib 境界とユーザー視点テストを守っているか。
- API/CRUD はリクエスト、レスポンス、ステータスコード、認可、ページング、並び順が一貫しているか。
- セキュリティは `docs/rules/security.md` に違反していないか。

## Skill Responsibilities

- `code-review`: レビュー、テスト妥当性、アーキテクチャ確認。
- `verify-qa`: 型チェック、テスト、リント、静的解析、audit の実行。
- `issue-planning`: GitHub Issue / Epic / sub-issue の作成、分解、Project field 整理。
- `tdd-issue`: GitHub Issue 起点の設計、TDD 実装、PR 準備。
- `worktree-issue`: TDD 不要の Issue 対応、ドキュメント、設定変更。
