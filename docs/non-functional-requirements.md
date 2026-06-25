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
| Browser auth boundary | First-party browser は same-origin BFF のみを呼び、Public API JWT を保持または直接送信しない |
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
- Keep Public API JWT in the BFF server-side session and never expose it to browser-readable storage or responses.
- Serve browser-facing BFF endpoints from the same origin as frontend assets; do not rely on cross-site authentication cookies.

Audit commands:

```bash
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

## Dependency Audit Operations

Dependency audit は Composer と pnpm 管理の依存ライブラリに対する
セキュリティ確認ゲートとして扱う。依存関係の追加・更新、Dependabot PR、
security-sensitive な変更、MVP hardening / release 前には、対象 manifest と
lockfile に対応する audit を実行する。

### Commands

通常は変更した package manager / manifest に対応する command を実行する。
依存更新や release 前の確認では、現在の backend / frontend / BFF の全対象を
確認する。

```bash
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

Root `package.json` または root `pnpm-lock.yaml` を変更した場合は、repo root で
`pnpm audit` も実行する。

### When To Run

- `composer.json` / `composer.lock` / `package.json` / `pnpm-lock.yaml` を変更した PR。
- 新しい dependency または dev dependency を追加した PR。
- Dependabot など dependency update PR の review 前。
- security-sensitive な認証、認可、BFF、cookie、CSRF、JWT、入力処理の変更。
- MVP hardening、release branch cut、または脆弱性 advisory を受けた臨時確認。

### Triage Policy

audit で finding が出た場合は、PR 本文または review comment に次を記録する。

| Item | 内容 |
| --- | --- |
| severity | audit が示す severity と advisory ID / URL |
| dependency path | affected package が direct dependency か transitive dependency か |
| usage | runtime dependency か dev dependency か、実行経路が backend / frontend / BFF / build-time のどれか |
| exploitability | このアプリの使い方で exploitability があるか。入力到達性、認証要否、browser exposure を確認する |
| remediation | patch / minor / major update、package removal、代替 package、設定変更などの remediation 方針 |
| owner and action | この PR で修正、follow-up Issue 作成、temporary exception のどれで扱うか |

runtime dependency の high / critical finding は原則として merge 前に解消する。
dev dependency の finding でも、build script、test runner、code generation、
CI secret exposure に関係する場合は runtime finding と同じ優先度で扱う。

### New Dependency PR Notes

新しい dependency を追加する PR では、PR 本文の修正ファイル説明または
マージ時の注意点に次を含める。

- 追加した reason と、既存コードまたは標準 API では足りない理由。
- 変更した manifest と lockfile。
- runtime dependency / dev dependency の区分。
- audit command の実行結果。未解消 finding がある場合は triage 結果。
- package が認証、cookie、CSRF、JWT、入力処理、HTML rendering に触れる場合の
  セキュリティ上の確認内容。

`.env`、API key、token、password、private URL などの secret 実値は、audit
結果、PR 本文、Issue、docs、test fixture に含めない。

### Major Update Policy

major update は破壊的変更を伴う前提で扱い、通常の feature / fix と同じ PR に
混ぜない。脆弱性修正で major update が必要な場合は、次を確認してから実施する。

- migration guide と breaking changes。
- 影響する runtime、API contract、BFF proxy、browser behavior、test helper。
- rollback または revert 可能性。
- 関連する type-check、test、lint、static analysis、audit の結果。

major update がすぐに適用できない場合は、temporary exception と follow-up
Issue を作成し、期限と再評価条件を明示する。

### Temporary Exception Policy

temporary exception は、固定版が未提供、または修正が大きな migration を必要とし
即時適用のリスクが高い場合に限る。例外は audit ignore の設定だけで済ませず、
PR または Issue に次を残す。

- advisory ID / URL、affected package、現在の version、dependency path。
- severity とこのアプリでの exploitability 判断。
- すぐに remediation できない reason。
- mitigation、owner、follow-up Issue。
- expiry と re-evaluation date。

runtime dependency の high / critical finding は、明確な mitigation と短い
expiry がない限り temporary exception にしない。期限切れの exception は新規
dependency 追加や release の前に再評価する。

## Local Reproducibility

The project must be runnable with Docker Compose and lockfiles.

Required local prerequisites:

- Docker Desktop or compatible Docker environment
- Node / pnpm for frontend work outside the container
- Composer / PHP for backend work outside the container

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

Authentication migration 後の Docker topology:

```text
Browser -> frontend origin (:3005) /api/* -> bff -> backend-nginx (private Docker network)
```

- Target service として Hono + TypeScript の `bff` を追加し、BrowserSession、CSRF、Public API forwarding を担わせる。
- Browser が利用する origin は React assets と BFF API を同一 origin として提供する。
- Local development では frontend dev proxy または frontend-facing gateway が `/api/*` を `bff` service へ転送する。
- `backend-nginx:8080` は Public API contract の直接検証用に利用できるが、first-party frontend の認証付き通信先にはしない。
- BFF は `backend-nginx` へ server-to-server request を行い、server-side に保持した JWT だけを `Authorization: Token <jwt>` として送る。
- `compose.yml`、Hono + TypeScript BFF runtime/container、proxy 設定、`.env.example` の追加変数は BFF 実装 Issue で変更する。

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
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

## Development Experience Requirements

- Commands in README and PR templates must be copy-pasteable.
- Long-running checks should be documented separately from fast local checks.
- Test failures should point to behavior, not only snapshots or implementation details.
- New dependencies require a short reason in the PR body.
- Generated files, logs, caches, and personal environment files must stay out of commits.
- When local setup changes, README and this document should be updated in the same PR.
