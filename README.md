# real-world

React 19 + Laravel 13 で API / CRUD / DDD を学ぶためのモノレポです。
フロントエンド、バックエンド、Docker 環境をまとめて管理しています。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| フロントエンド | React 19 + TypeScript 5.9 + Vite 8 |
| バックエンド | Laravel 13 + PHP 8.4 |
| DB | MySQL 8.0 |
| テスト | Vitest + Testing Library / Pest |
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

停止:

```bash
docker compose down
```

## アクセス先

| サービス | URL |
| --- | --- |
| フロントエンド | http://localhost:3005 |
| バックエンド API | http://localhost:8080 |
| Mailpit | http://localhost:8025 |

## テスト・リント

フロントエンド:

```bash
cd frontend && pnpm vitest run
cd frontend && pnpm eslint .
cd frontend && pnpm tsc -b --noEmit
```

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
