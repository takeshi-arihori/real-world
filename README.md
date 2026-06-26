# real-world

React 19 + Laravel 13 で API / CRUD / DDD を学ぶためのモノレポです。
フロントエンド、バックエンド、Docker 環境をまとめて管理しています。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| フロントエンド | React 19 + TypeScript 5.9 + Vite 8 |
| BFF | Hono + TypeScript |
| バックエンド | Laravel 13 + PHP 8.4 |
| DB / Session Store | MySQL 8.0 / Redis 7 |
| テスト | Vitest + Testing Library / Pest / Playwright |
| 品質チェック | ESLint / Pint / PHPStan |

## セットアップ

必要なもの:

- Docker Desktop
- ホスト側で docs test / E2E を実行する場合は Node 24 + pnpm（`mise.toml` 参照）

初回起動:

```bash
docker compose up -d
docker compose exec backend-php composer install
cp backend/.env.example backend/.env
perl -0pi -e 's/DB_HOST=.*/DB_HOST=db/; s/DB_PORT=.*/DB_PORT=3306/; s/DB_DATABASE=.*/DB_DATABASE=real_world/; s/DB_USERNAME=.*/DB_USERNAME=real_world/; s/DB_PASSWORD=.*/DB_PASSWORD=secret/' backend/.env
JWT_SECRET="$(docker compose exec -T backend-php php -r 'echo bin2hex(random_bytes(32));')" perl -0pi -e 's/JWT_SIGNING_SECRET=.*/JWT_SIGNING_SECRET=$ENV{JWT_SECRET}/' backend/.env
docker compose exec backend-php php artisan key:generate
docker compose exec backend-php php artisan migrate
docker compose exec frontend pnpm install
```

BFF は起動時に `bff/pnpm-lock.yaml` の checksum を見て、必要な場合だけ container 内で `pnpm install --frozen-lockfile` を実行します。
`backend/.env` は gitignored のローカル設定です。既存ファイルがある場合は上書きせず、Docker では `DB_HOST=db`、`DB_DATABASE=real_world`、`DB_USERNAME=real_world`、`DB_PASSWORD=secret`、`JWT_SIGNING_SECRET` が設定されていることを確認してください。

Dev Container 内でフロントエンドテストを実行する場合:

```bash
cd /workspace/frontend && pnpm install && pnpm test
```

Dev Container では `/workspace/node_modules` と `/workspace/frontend/node_modules` を named volume に分離し、ホスト OS 側の `node_modules` を参照しない構成にしています。

Frontend は browser から same-origin の `/api/*` だけを呼び、Vite dev server が BFF (`BFF_PROXY_TARGET`, 既定 `http://localhost:3006`) へ proxy します。
既存の `frontend/.env.local` に `VITE_API_BASE_URL=http://localhost:8080` が残っている場合は、Public API/backend-nginx 直送になるため削除してください。

停止:

```bash
docker compose down
```

## アクセス先

| サービス | URL / Port | 用途 |
| --- | --- | --- |
| `frontend` | http://localhost:3005 | Vite dev server。browser はこの origin の `/api/*` を呼ぶ |
| BFF (`bff`) | http://localhost:3006 | Hono BFF。通常は frontend の proxy 経由で使う |
| `backend-nginx` | http://localhost:8080 | Laravel Public API の直接確認用 |
| `db` | `localhost:3309` -> container `3306` | MySQL |
| `redis` | `localhost:6379` | BFF BrowserSession store |
| `mailpit` | SMTP `localhost:1025` / UI http://localhost:8025 | ローカルメール確認 |

Docker 環境では、frontend の Vite dev server が same-origin の `/api/*` request を BFF へ proxy します。
BFF は private network 上の `backend-nginx` へ server-to-server request を行い、BrowserSession に保持した Public API JWT だけを `Authorization: Token <jwt>` として送信します。

## バックエンドのデバッグ

Xdebug は通常の Docker 起動では `XDEBUG_MODE=off` のため、リクエストへ介入しません。
devcontainer では `XDEBUG_TRIGGER` を指定したときだけデバッグセッションを開始します。

VS Code の devcontainer でデバッグする場合:

1. VS Code の Run and Debug で `Listen for Xdebug (backend-php)` を開始する
2. trigger 付きで backend API へリクエストする

```bash
curl -H 'XDEBUG_TRIGGER: 1' http://localhost:8080/api/user
```

CLI で artisan やテストをデバッグする場合:

```bash
docker compose exec -e XDEBUG_TRIGGER=1 backend-php php artisan test
```

devcontainer 外で Xdebug を有効にする場合は、明示的に `XDEBUG_MODE` を指定して起動します。

```bash
XDEBUG_MODE=develop,debug docker compose up -d backend-php backend-nginx
```

## テスト・リント

Docs / infra:

```bash
pnpm install
pnpm test:docs
pnpm test:infra
git diff --check
```

フロントエンド:

```bash
pnpm -C frontend tsc -b --noEmit
pnpm -C frontend vitest run
pnpm -C frontend eslint .
```

BFF:

```bash
pnpm -C bff type-check
pnpm -C bff test
pnpm -C bff lint
```

認証統合 QA（Docker 起動済み環境）:

```bash
pnpm qa:auth
```

E2E smoke（Docker 起動済み環境）:

```bash
pnpm install
pnpm e2e:install
pnpm e2e
```

E2E は初回起動とバックエンド初期設定が済んだ Docker 環境に対して実行します。
Browser から `http://127.0.0.1:3005` を開き、Vite proxy -> BFF -> Laravel API の経路で register / login / article / comment / favorite の happy path を確認します。
別の frontend origin で実行する場合は `E2E_BASE_URL=http://localhost:3005 pnpm e2e` のように指定できます。
失敗時は `test-results/` の screenshot / trace と `playwright-report/` の HTML report を確認します。

バックエンド:

```bash
docker compose exec backend-php php artisan test
docker compose exec backend-php ./vendor/bin/pint --test
docker compose exec backend-php ./vendor/bin/phpstan analyse
```

## 主なディレクトリ

| パス | 内容 |
| --- | --- |
| `frontend/` | React アプリケーション |
| `backend/` | Laravel API |
| `docker/` | Docker 関連設定 |
| `docs/` | 要件、設計、運用ルール |
| `specs/` | Issue 単位の設計メモ・実行プラン（テンプレート以外はgitignored） |

## 関連ドキュメント

- [Docs Guide](docs/README.md)
- [要件定義](docs/requirements.md)
- [非機能要件](docs/non-functional-requirements.md)
- [AI Harness Design](docs/ai/harness.md)
- [コーディングルール](docs/rules/)
- [ドメイン設計](docs/arch/)
- [Label運用ガイド](docs/labels.md)
