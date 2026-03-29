# Backend

Laravel 13 ベースの backend アプリケーションです。実装前にルートの `README.md` と `CLAUDE.md` を確認してください。

## 参照先

- ルール: `../.claude/rules/backend.md`
- セキュリティ: `../.claude/rules/security.md`
- ドメイン設計: `../docs/arch/`
- Issue単位の設計メモ: `../specs/`（gitignored）

## よく使うコマンド

```bash
cd backend && composer install
cd backend && php artisan test
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
```

Dev Container 利用時もコマンドは同じです。`php` / `composer` / `artisan` は `backend-php` コンテナへ委譲されるため、実際の PHP 実行環境は `docker/backend/php/` の定義に統一されます。
