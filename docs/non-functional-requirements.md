# Non-Functional Requirements

> Issue: #37
> Status: 初版

この文書は RealWorld プロジェクトを継続開発するための品質、開発体験、ローカル再現性、検証ゲートを定義する。
詳細なコーディング規約は `docs/rules/*` を正本とし、この文書ではプロジェクト全体の非機能要件を扱う。

## Quality Goals

| Category | Requirement |
| --- | --- |
| Correctness | API 契約、認可、バリデーション、境界値をテストで確認する |
| Maintainability | Backend は DDD 4層、Frontend は `app/`, `features/`, `shared/`, `lib/` の境界を守る |
| Type safety | TypeScript strict と PHPStan で静的に検出できる問題をCI前に潰す |
| Security | `.env`、シークレット、危険な動的実行、SQL文字列結合を禁止する |
| Reproducibility | Docker Compose と lockfile により、ローカルで同じ構成を再現できる |
| Reviewability | Issue、spec、PR、テスト計画を紐付け、レビューで判断しやすくする |

## TypeScript Strict Policy

Frontend は TypeScript strict を前提にする。
実装時は `frontend/tsconfig*.json` の strict 系設定を緩めない。

Required:

- `any` を使わない。外部入力は `unknown` で受け、型ガードや schema で絞り込む。
- 関数の公開境界では戻り値型を明示する。
- API response 型と UI type を分け、`features/*/api/` で変換する。
- null / undefined を明示的に扱う。
- `as` キャストは最小化し、必要な場合は理由をコードコメントで残す。

Forbidden:

- strict 設定を無効化するための `// @ts-ignore` の常用
- `skipLibCheck` などの緩和設定追加を問題回避目的で行うこと
- API response を型変換せずに UI へ広げること

Verification:

```bash
cd frontend && pnpm tsc -b --noEmit
```

## Lint / Format Policy

### Frontend

- ESLint を TypeScript / React の静的解析ゲートとして使う。
- Formatting は ESLint と既存スタイルに従う。
- Prettier は現時点で未導入。導入する場合は別 Issue で設定し、ESLint と責務が衝突しないようにする。

Verification:

```bash
cd frontend && pnpm eslint .
```

### Backend

- Laravel Pint を PHP の formatting gate として使う。
- PHPStan / Larastan を静的解析ゲートとして使う。
- `declare(strict_types=1)`、戻り値型、DDD の依存方向を維持する。

Verification:

```bash
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
```

### Documentation

- Markdown は手動整形と `git diff --check` を最低限のチェックにする。
- 恒久的な判断は `docs/` に残し、`AGENTS.md` や agent 固有ファイルへ詳細を重複させない。

Verification:

```bash
git diff --check
```

## Test Policy

### Frontend Tests

Stack:

- Vitest
- Testing Library
- `@testing-library/jest-dom`
- `@testing-library/user-event`

Focus:

- ユーザー視点の画面挙動
- フォーム入力、送信中状態、バリデーション表示
- route guard と redirect
- API error の表示
- 認証状態に応じた UI の出し分け

Avoid:

- 実装詳細の state や private function への過剰な依存
- API response の手作業モック重複
- Snapshot だけで仕様を確認したことにするテスト

Verification:

```bash
cd frontend && pnpm vitest run
```

### Backend Tests

Stack:

- Pest
- Laravel testing utilities
- PHPStan / Larastan

Focus:

- Feature test: API 契約、HTTP status、response wrapper、認証、認可、バリデーション
- Unit test: Entity / ValueObject / Domain Service の業務ルール
- Repository test: 永続化変換、unique constraint、relationship
- Security test: 未認証、他者操作、存在しない resource

Avoid:

- Controller にビジネスロジックを寄せて Feature test だけで済ませること
- 認可や失敗ケースを正常系の補助としてしか見ないこと
- DB 状態に依存して順序が不安定なテスト

Verification:

```bash
cd backend && php artisan test
```

## Git Hooks Policy

Root package uses Husky and commitlint.

Required:

- Commit message follows Conventional Commits.
- `type` and optional `scope` use English.
- Description is Japanese.
- No `Co-Authored-By:` line.

Recommended local setup:

```bash
npm install
```

Hook responsibilities:

| Hook | Responsibility |
| --- | --- |
| `commit-msg` | Conventional Commits validation |
| `pre-commit` | Optional fast checks only; long tests should stay in CI or manual QA |
| `pre-push` | Optional targeted checks; must not make normal development too slow |

If new hooks are added, document the command, expected runtime, and bypass policy in `docs/rules/git-flow.md`.

## Security Requirements

Always follow `docs/rules/security.md`.

Required:

- Do not edit or commit `.env`.
- Do not hard-code secrets, API keys, tokens, passwords, or private URLs.
- Do not use `eval()`, `exec()`, `shell_exec()`, unchecked `innerHTML`, or unchecked `dangerouslySetInnerHTML`.
- Do not build SQL with string concatenation.
- Use FormRequest for all backend input validation.
- Use Policy / Gate for authorization.
- Keep frontend validation as UI feedback only.

Audit commands:

```bash
cd backend && composer audit
cd frontend && pnpm audit
```

## Local Reproducibility

The project must be runnable with Docker Compose and lockfiles.

Required local prerequisites:

- Docker Desktop or compatible Docker environment
- Node / pnpm for frontend work outside the container
- Composer / PHP for backend work outside the container
- Optional: VS Code Dev Containers

Version hints:

- `mise.toml` pins Node `24` and Python `3.14`.
- Backend dependencies are locked by `backend/composer.lock`.
- Frontend dependencies are locked by `frontend/pnpm-lock.yaml`.
- The actual package versions are resolved from each package manifest and lockfile.

Docker services:

| Service | Purpose | Port |
| --- | --- | --- |
| `frontend` | Vite dev server | `3005` |
| `backend-nginx` | Laravel API through Nginx | `8080` |
| `backend-php` | PHP-FPM / Laravel runtime | internal |
| `db` | MySQL | host `3309`, container `3306` |
| `mailpit` | Local mail UI | `8025` |

Expected setup flow:

```bash
docker compose up -d
docker compose exec backend-php composer install
docker compose exec backend-php php artisan key:generate
docker compose exec backend-php php artisan migrate
docker compose exec frontend pnpm install
```

`.env` handling:

- Use `backend/.env.example` as the template.
- `backend/.env` is ignored and must not be committed.
- Changes needed by every developer go into `.env.example` or docs, not a personal `.env`.

## README Requirements

The root README should keep the following information current:

- Project purpose and stack summary
- Required local tools
- Docker startup and shutdown commands
- Backend setup commands
- Frontend setup commands
- Service URLs and ports
- Test, lint, type-check, and static analysis commands
- Main directory map
- Links to requirements, rules, architecture, labels, and AI harness docs
- Known setup caveats such as first-run dependency install or `.env` creation

README should remain a quick start. Detailed rules belong in `docs/`.

## CI / QA Gate

Before PR review, run the checks relevant to touched areas.

Frontend changes:

```bash
cd frontend && pnpm tsc -b --noEmit
cd frontend && pnpm vitest run
cd frontend && pnpm eslint .
```

Backend changes:

```bash
cd backend && php artisan test
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
```

Docs-only changes:

```bash
git diff --check
```

Security-sensitive or dependency changes:

```bash
cd backend && composer audit
cd frontend && pnpm audit
```

## Development Experience Requirements

- Commands in README and PR templates must be copy-pasteable.
- Long-running checks should be documented separately from fast local checks.
- Test failures should point to behavior, not only snapshots or implementation details.
- New dependencies require a short reason in the PR body.
- Generated files, logs, caches, and personal environment files must stay out of commits.
- When local setup changes, README and this document should be updated in the same PR.
