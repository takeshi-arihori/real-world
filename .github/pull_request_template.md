## 概要

- <変更内容を箇条書き>

## 関連 Issue

Closes #<issue番号>

## Labels

このPRに関連するLabelは [Label運用ガイド](docs/labels.md) を確認してください。

- type:
- area:
- priority:
- status:

## テスト計画

- [ ] フロントエンド: `pnpm vitest run` / `pnpm eslint .` / `pnpm tsc -b --noEmit`
- [ ] バックエンド: `php artisan test` / `./vendor/bin/pint --test` / `./vendor/bin/phpstan analyse`
- [ ] ドキュメント: `git diff --check` と参照確認
- [ ] 対象外の検証がある場合は理由を記載

## レビューチェックリスト

- [ ] コードが `docs/rules/` の規約に準拠している
- [ ] テストが追加・更新されている
- [ ] 型安全性が確保されている（`any`, 不要な `as` がない）
- [ ] N+1 クエリが発生していない
- [ ] セキュリティ上の問題がない（`docs/rules/security.md` 参照）
- [ ] 不要なファイル（`.env`, ログ, デバッグコード）が含まれていない
