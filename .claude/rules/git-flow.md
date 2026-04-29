# Git Flow ルール

## ブランチ戦略

```
main ←── release/<version> ←── develop ←── feature/#<issue>-<slug>
  ↑                                    ←── fix/#<issue>-<slug>
  └──── hotfix/#<issue>-<slug>
```

| ブランチ                  | 用途                                     | PRのマージ先       |
| ------------------------- | ---------------------------------------- | ------------------ |
| `main`                    | リリース済み（production）               | —                  |
| `develop`                 | 次リリースの統合ブランチ                 | —                  |
| `feature/#<issue>-<slug>` | 機能開発                                 | `develop`          |
| `fix/#<issue>-<slug>`     | バグ修正                                 | `develop`          |
| `release/<version>`       | リリース準備（バージョン番号: `v1.2.3`） | `main` + `develop` |
| `hotfix/#<issue>-<slug>`  | 本番緊急修正                             | `main` + `develop` |

- `<slug>` は英語 kebab-case、短く簡潔に
- `feature/` / `fix/` は `develop` ブランチの最新から切ること
- `hotfix/` は `main` ブランチの最新から切ること

## コミット規約

### メッセージ形式

Conventional Commits 形式を使用する。

```
<type>: <説明>
```

- 説明は**日本語・英語どちらでも可**
- `Co-Authored-By:` 行は**含めない**
- コミットメッセージは commitlint で自動検証される（Husky）

### コミットタイプ

| type       | 用途                                     |
| ---------- | ---------------------------------------- |
| `feat`     | 新機能追加                               |
| `fix`      | バグ修正                                 |
| `refactor` | リファクタリング（機能変更なし）         |
| `test`     | テスト追加・修正                         |
| `docs`     | ドキュメント変更                         |
| `chore`    | ビルド・設定・依存関係の変更             |
| `ci`       | CI/CD 設定の変更                         |
| `release`  | リリース関連の変更（バージョンバンプ等） |
| `revert`   | コミットの取り消し                       |

### スコープ（任意）

モノレポ内の変更対象を `()` で明示できる（省略可）:

```
feat(frontend): ログインフォームを追加
fix(backend): ユーザー作成時のバリデーションを修正
chore(ci): GitHub Actions のキャッシュ設定を更新
```

| スコープ   | 対象                                |
| ---------- | ----------------------------------- |
| `frontend` | `frontend/` 配下の変更              |
| `backend`  | `backend/` 配下の変更               |
| `db`       | マイグレーション・DB設計の変更      |
| `ci`       | CI/CD 設定の変更                    |
| `docs`     | ドキュメントの変更                  |
| `infra`    | Docker・devcontainer 等インフラ変更 |

### コミット粒度

- テスト追加・実装・リファクタは**別コミット**にする
- TDD サイクルの場合:
  1. `test: <機能>のテストを追加` (Red)
  2. `feat: <機能>を実装` (Green)
  3. `refactor: <機能>のリファクタリング` (Refactor、必要な場合のみ)

## PR 方針

### 基本ルール

- **1 Issue = 1 PR** を厳守
- **squash merge** で develop/main にマージ
- `Closes #<issue番号>` で Issue と紐付け

### PR タイトル

- 70文字以内
- コミットタイプを含める（例: `feat: ユーザー認証を追加 (#42)`）

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
