# Repository Guidelines

## プロジェクト構成とモジュール

このリポジトリは React 19 + TypeScript / Laravel 13 のモノレポです。`frontend/` は Vite アプリで、主要コードは `frontend/src/`、画像などは `frontend/src/assets/`、テスト設定は `frontend/src/test/setup.ts` に置きます。新規機能は `.claude/rules/frontend.md` の方針に沿い、`app/`、`features/`、`shared/`、`lib/` へ分けてください。

`backend/` は Laravel API です。テストは `backend/tests/Feature` と `backend/tests/Unit`、マイグレーションや Factory は `backend/database/` に置きます。ドメイン実装は `.claude/rules/backend.md` に従い、`Domain`、`Application`、`Infrastructure`、`Presentation` の層分離を守ります。設計資料は `docs/adr/`、`docs/arch/`、`docs/design/` を参照します。

## ビルド・テスト・開発コマンド

- `docker compose up -d`: MySQL、API、frontend、Mailpit を起動します。
- `docker compose exec backend-php bash`: PHP コンテナに入ります。
- `cd frontend && pnpm dev`: Vite を `http://localhost:3005` で起動します。
- `cd frontend && pnpm build`: 型チェック後に frontend をビルドします。
- `cd frontend && pnpm lint && pnpm test`: ESLint と Vitest を実行します。
- `cd backend && composer install`: PHP 依存関係を入れます。
- `cd backend && php artisan test`: Pest テストを実行します。
- `cd backend && ./vendor/bin/pint --test && ./vendor/bin/phpstan analyse`: PHP 整形確認と静的解析を実行します。

## コーディングスタイルと命名規則

TypeScript/JS は 2 スペース、PHP は Laravel Pint の既定に従います。Frontend は Functional Component + Hooks のみを使い、`React.FC`、`any`、default export は避けます。コンポーネントは `PascalCase.tsx`、Hook は `useThing.ts`、ユーティリティは `camelCase.ts` で命名します。Backend は Controller を薄く保ち、入力検証は FormRequest、業務ルールは Domain/Application、永続化詳細は Infrastructure に置きます。

## テスト方針

Frontend は Vitest、Testing Library、`@testing-library/user-event` を使います。テストは `src/**/*.test.{ts,tsx}`、特にコンポーネントは `__tests__/<ComponentName>.test.tsx` に置き、`getByRole` などユーザー視点のクエリを優先します。カバレッジ目標は 80% です。Backend は Pest を使い、Feature テストで HTTP 挙動、Unit テストでサービスやドメインロジックを検証します。Factory/Faker を使い、テスト間の独立性を保ってください。

## コミットと Pull Request

コミットは commitlint で検証される Conventional Commits 形式です。type は `feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`ci`、`release`、`revert` を使います。scope は `frontend`、`backend`、`db`、`infra`、`docs` などが推奨です。type/scope は英字、コミット説明は日本語で書いてください。ブランチは `develop` から `feature/#<issue>-<slug>` または `fix/#<issue>-<slug>` で切ります。PR は `develop` 向けにし、タイトル・本文・テンプレート記入内容を日本語で記載します。`.github/pull_request_template.md` に沿って概要、`Closes #<issue>`、テスト計画を記載し、squash merge します。

## セキュリティとエージェント向け注意

変更前に `CLAUDE.md` と関連する `.claude/rules/*.md` を確認してください。`.env` の編集・コミット、シークレットの直書き、危険な動的実行、SQL 文字列結合、サーバーサイド検証の省略は禁止です。Issue 対応では `docs/design/_template-feature-spec.md` を元に `specs/<feature>.md` を作成・更新し、Red → Green → Refactor で進めます。
