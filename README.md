# real-world

React 19 + Laravel 13 で API / CRUD / DDD を学ぶためのモノレポです。
フロントエンド、バックエンド、Docker 環境をまとめて管理しています。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| フロントエンド | React 19 + TypeScript 5.9 + Vite 8 |
| バックエンド | Laravel 13 + PHP 8.4 |
| DB | MySQL 8.0 |
| テスト | Vitest + Testing Library / Pest / Playwright |
| 品質チェック | ESLint / Pint / PHPStan |

## セットアップ

必要なもの:

- Docker Desktop

起動:

```bash
docker compose up -d
```

バックエンド初期設定:

```bash
docker compose exec backend-php bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

フロントエンド初期設定:

```bash
docker compose exec frontend sh
pnpm install
```

Frontend は browser から same-origin の `/api/*` だけを呼び、Vite dev server が BFF (`BFF_PROXY_TARGET`, 既定 `http://localhost:3006`) へ proxy します。
既存の `frontend/.env.local` に `VITE_API_BASE_URL=http://localhost:8080` が残っている場合は、Public API/backend-nginx 直送になるため削除してください。

停止:

```bash
docker compose down
```

## アクセス先

| サービス | URL |
| --- | --- |
| フロントエンド | http://localhost:3005 |
| BFF | http://localhost:3006 |
| バックエンド API | http://localhost:8080 |
| Mailpit | http://localhost:8025 |

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

フロントエンド:

```bash
cd frontend && pnpm vitest run
cd frontend && pnpm eslint .
cd frontend && pnpm tsc -b --noEmit
```

BFF:

```bash
pnpm -C bff type-check
pnpm -C bff test
```

認証統合 QA（Docker 起動済み環境）:

```bash
pnpm qa:auth
```

E2E smoke（Docker 起動済み環境）:

```bash
pnpm install
pnpm e2e:install
docker compose up -d
docker compose exec backend-php composer install
docker compose exec backend-php php artisan key:generate
docker compose exec backend-php php artisan migrate
pnpm e2e
```

E2E は browser から `http://127.0.0.1:3005` を開き、Vite proxy -> BFF -> Laravel API の経路で register / login / article / comment / favorite の happy path を確認します。
別の frontend origin で実行する場合は `E2E_BASE_URL=http://localhost:3005 pnpm e2e` のように指定できます。
失敗時は `test-results/` の screenshot / trace と `playwright-report/` の HTML report を確認します。

バックエンド:

```bash
cd backend && php artisan test
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
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
- [AI Harness Design](docs/ai/harness.md)
- [コーディングルール](docs/rules/)
- [ドメイン設計](docs/arch/)
- [Label運用ガイド](docs/labels.md)
