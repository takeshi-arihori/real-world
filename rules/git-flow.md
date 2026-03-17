# Git Flow ルール

## ブランチ命名規則

| プレフィックス | 用途 | 例 |
|-------------|------|-----|
| `feature/#<issue>-<slug>` | 機能開発 | `feature/#42-add-user-auth` |
| `fix/#<issue>-<slug>` | バグ修正 | `fix/#15-login-redirect` |
| `hotfix/#<issue>-<slug>` | 緊急修正 | `hotfix/#99-crash-on-load` |

- `<slug>` は英語 kebab-case、短く簡潔に
- main ブランチの最新から切ること

## コミット規約

### メッセージ形式

Conventional Commits 形式を使用する。

```
<type>: <説明（英語）>
```

### コミットタイプ

| type | 用途 |
|------|------|
| `feat` | 新機能追加 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング（機能変更なし） |
| `test` | テスト追加・修正 |
| `docs` | ドキュメント変更 |
| `chore` | ビルド・設定・依存関係の変更 |
| `ci` | CI/CD 設定の変更 |

### コミット粒度

- テスト追加・実装・リファクタは**別コミット**にする
- TDD サイクルの場合:
  1. `test: add tests for <feature>` (Red)
  2. `feat: implement <feature>` (Green)
  3. `refactor: clean up <feature>` (Refactor、必要な場合のみ)

## PR 方針

### 基本ルール

- **1 Issue = 1 PR** を厳守
- **squash merge** で main にマージ
- `Closes #<issue番号>` で Issue と紐付け

### PR タイトル

- 70文字以内
- コミットタイプを含める（例: `feat: add user authentication (#42)`）

### PR テンプレート

```markdown
## Summary
- <変更内容を箇条書き>

## Issue
Closes #<issue番号>

## Test plan
- [ ] Vitest テストパス
- [ ] Pest テストパス
- [ ] ESLint リントパス
- [ ] Pint リントパス
```

### PR レビューチェックリスト

- [ ] コードが `rules/` の規約に準拠している
- [ ] テストが追加・更新されている
- [ ] 型安全性が確保されている（`any`, 不要な `as` がない）
- [ ] N+1 クエリが発生していない
- [ ] セキュリティ上の問題がない（`rules/security.md` 参照）
- [ ] 不要なファイル（`.env`, ログ, デバッグコード）が含まれていない
