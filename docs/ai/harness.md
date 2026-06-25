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

## Shell Command Policy

このプロジェクトで AI agent が shell command を実行するときは、セッションをまたいでも必ず RTK を経由する。

- 通常の shell command は `rtk <command>` で実行する。
- `git diff` や `git status` のように raw output を読みたい場合、または RTK のフィルタリングや引数解釈が command の挙動に影響する場合は `rtk proxy <command>` を使う。
- GitHub CLI、Docker、curl、git の sandbox 外実行や approval 付き実行でも、原則として `rtk proxy gh ...`、`rtk proxy docker ...`、`rtk proxy curl ...`、`rtk proxy git ...` のように RTK 経由を維持する。
- `rtk` 経由では command が壊れる、承認 prefix と衝突する、または tool/runtime の制約で実行できない場合に限り bare command を使ってよい。その場合は、commentary または approval justification に「なぜ bare command にしたか」を具体的に残す。
- bare command fallback は必要最小限の 1 command に留め、以後の command は RTK 経由へ戻す。

## Worktree Policy

AI agent が Issue 対応で worktree を使う場合、作業用 checkout は repo root 配下の `.worktree/<task-name>` に作成する。
session をまたいでも作業場所を再発見できるように、標準の作成先として repo 外の一時ディレクトリは使わない。

- `.worktree` は `.gitignore` 済みの非追跡作業領域として扱い、配下の内容は git 管理しない。
- `<task-name>` は `issue-<issue-number>-<short-slug>` を基本形にする。
- ブランチ名は `docs/rules/git-flow.md` に従い、例として `feature/#102-worktree-location` のようにする。
- 手動で作成する場合は repo root で `git worktree add -b "feature/#<issue-number>-<slug>" ".worktree/issue-<issue-number>-<slug>" develop` を実行する。
- worktree には `node_modules/` や `vendor/` が含まれないため、対象レイヤーに応じて worktree 内で依存関係を入れる。
- 作業完了後、PR 作成と必要な引き継ぎが済んだ worktree はクリーンアップする。

## Codex Sandbox And GitHub CLI Policy

Codex sandbox 内では、macOS keyring や外部ネットワークへ到達できないことがある。
そのため `gh issue`、`gh pr`、`gh api` が認証済みのユーザー端末では成功しても、sandbox 内では失敗する場合がある。
これは sudo / root 権限で解決する問題ではなく、sandbox 境界、keyring、network access の扱いとして切り分ける。

- GitHub API の読み取り・作成・編集が必要な場合は、まず対象リポジトリ、Issue / PR 番号、操作内容を明確にする。
- `gh` が keyring、network access、permission、host resolution などの理由で sandbox 内実行に失敗した場合は、必要性を説明して sandbox 外実行の許可を得てから再実行する。
- `GH_TOKEN` / `GITHUB_TOKEN` を shell config、`.env`、git 管理ファイル、Issue / PR 本文、ログへ直書きしない。
- 認証は `gh auth login` によるユーザーセッションの keyring 認証を使い、token 実値を AI agent に渡さない。
- 認証状態の確認や API 操作で token 値、secret 値、cookie、credential helper の実体を出力しない。
- sandbox 外実行でも、実行するコマンドは必要最小限にし、読み取り、作成、編集、push などの目的を分けて確認できるようにする。
- sudo / root 権限、root の keyring、個人 token の一時 export で回避しない。

この方針は GitHub Issue / PR / Project 操作全般に適用する。
Issue、sub-issue、Project field の具体的な運用は `docs/rules/project.md` を正本とする。

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
