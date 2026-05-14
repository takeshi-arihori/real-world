# AI Harness Guide

React 19 + TypeScript / Laravel 13 のモノレポ。API、CRUD、新しい技術を学ぶためのプロジェクトであり、AI は実装量よりもレビュー品質を重視する。

このファイルは詳細手順ではなく入口として使う。AI ハーネス設計の正本は `docs/ai/harness.md`、コーディングルールの正本は `docs/rules/*`。

参考:

- `docs/ai/harness.md`
- https://openai.com/ja-JP/index/harness-engineering/
- https://developers.openai.com/codex/skills

## 作業の優先順位

1. 変更差分と目的を把握する。
2. 該当する skill を読み込む。
3. `docs/ai/harness.md` と必要な `docs/rules/*` を確認する。
4. テストの妥当性、アーキテクチャ、セキュリティを重点的に確認する。

## Worktree 運用

- Issue 対応を worktree で行う場合、repo root 配下の `.worktree/<task-name>` に作成する。
- `.worktree` は gitignored の非追跡作業領域として扱い、作業完了後にクリーンアップする。
- 詳細な作成手順と命名は `docs/ai/harness.md` と該当 skill を正本とする。

## Skill の使い分け

- `.agents/skills/code-review/` - コードレビュー、テスト妥当性、アーキテクチャ確認。
- `.agents/skills/verify-qa/` - 型チェック、テスト、リント、静的解析、audit の実行。
- `.agents/skills/issue-planning/` - GitHub Issue / Epic / sub-issue の作成、分解、Project field 整理。
- `.agents/skills/tdd-issue/` - GitHub Issue 起点の TDD 実装。
- `.agents/skills/worktree-issue/` - TDD 不要の Issue 対応やドキュメント・設定変更。

## 参照する Rules

- `docs/rules/security.md` - 常に確認する。
- `docs/rules/frontend.md` - `frontend/` 変更時。
- `docs/rules/backend.md` - `backend/` 変更時。
- `docs/rules/db.md` - DB・マイグレーション変更時。
- `docs/rules/git-flow.md` - ブランチ、コミット、PR 作成時。
- `docs/rules/project.md` - Issue、Epic、sub-issue、GitHub Projects 運用時。
- `docs/rules/log.md` - ログ追加時。

## レビュー観点

- テストが仕様、失敗ケース、境界値、認可、バリデーションを検証しているか。
- Laravel の層分離、Controller の薄さ、FormRequest、Domain/Application/Infrastructure/Presentation の責務が守られているか。
- React の feature/shared/app/lib 分離、Hooks と Component の責務、ユーザー視点テストが守られているか。
- `.env` 編集、シークレット直書き、危険な動的実行、SQL 文字列結合がないか。

## 最低限の制約

- `.env` を編集・コミットしない。
- シークレットや API キーを直書きしない。
- サーバーサイド検証を省略しない。
- 詳細な判断に迷ったら、このファイルへ追記せず `docs/` 側を更新する。
