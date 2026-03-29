# real-world

React 19 + Laravel 13 のモノレポ構成。AI駆動開発（ハーネスエンジニアリング）の学習・実践プロジェクト。

## 技術スタック

| レイヤー | 技術 | テスト | リント |
|---------|------|--------|-------|
| フロントエンド | React 19 + TypeScript 5.9 + Vite 8 | Vitest + Testing Library | ESLint |
| バックエンド | Laravel 13 + PHP 8.4 | Pest 4.4 | Pint + PHPStan |
| DB | MySQL 8.0 | — | — |

## ディレクトリ構成

```
.
├── frontend/          # React 19 + TypeScript
├── backend/           # Laravel 13
├── docker/
│   ├── backend/       # PHP-FPM / Nginx
│   ├── frontend/      # Node
│   └── db/            # MySQL
├── specs/             # Issue単位の設計メモ・実行プラン（gitignored）
├── .claude/
│   ├── rules/         # AI向けコーディング規約
│   └── skills/        # Claude Code スキル
├── .devcontainer/     # Dev Container 設定
├── docs/
│   ├── adr/           # アーキテクチャ決定記録
│   ├── arch/          # ドメイン設計・Bounded Context
│   └── design/        # 機能設計テンプレート
└── compose.yml
```

## セットアップ

### 必要なもの

- Docker Desktop
- VS Code + Dev Containers 拡張（devcontainer 利用時）

### 起動

```bash
# 全サービス起動
docker compose up -d

# PHPコンテナ接続
docker compose exec backend-php bash

# 停止
docker compose down
```

### バックエンド初期設定

```bash
docker compose exec backend-php bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

### フロントエンド初期設定

```bash
docker compose exec frontend sh
pnpm install
```

## アクセス先

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:8080 |
| Mailpit | http://localhost:8025 |

## テスト・リント

### フロントエンド

```bash
cd frontend && pnpm vitest run      # テスト
cd frontend && pnpm eslint .        # リント
cd frontend && pnpm tsc -b --noEmit # 型チェック
```

### バックエンド

```bash
cd backend && php artisan test              # テスト
cd backend && ./vendor/bin/pint --test      # リント確認
cd backend && ./vendor/bin/phpstan analyse  # 静的解析
```

## Dev Container

VS Code / Cursor の Dev Containers で開発環境を起動できます。

- Claude Code が事前インストール済み
- GitHub CLI (`gh`) と `pnpm` がそのまま使える
- ホストの `~/.claude`（認証情報）・`~/.config/gh`（GitHub CLI）を自動マウント
- `backend/.env` の環境変数をコンテナ内に自動注入
- `php` / `composer` / `artisan` は devcontainer から `backend-php` サービスへ委譲されるため、`cd backend && php artisan test` などの既存コマンドをそのまま使える
- Dev Container は開発用であり、ネットワーク隔離 sandbox としては扱わない
