## Summary

- <変更内容を箇条書き>

## Issue

Closes #<issue番号>

## Test plan

- [ ] Vitest テストパス
- [ ] Pest テストパス
- [ ] ESLint リントパス
- [ ] Pint リントパス

## Review checklist

- [ ] コードが `rules/` の規約に準拠している
- [ ] テストが追加・更新されている
- [ ] 型安全性が確保されている（`any`, 不要な `as` がない）
- [ ] N+1 クエリが発生していない
- [ ] セキュリティ上の問題がない（`rules/security.md` 参照）
- [ ] 不要なファイル（`.env`, ログ, デバッグコード）が含まれていない
