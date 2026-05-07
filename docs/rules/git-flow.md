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

- `type` / `scope` は Conventional Commits に従い英字、説明は**日本語**で書く
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

Issue / Project / Epic の運用は [`project.md`](project.md) を正本とする。

### 基本ルール

- **1 Issue = 1 PR** を厳守
- `feature/*` / `fix/*` から `develop` へは **squash merge** する
- `develop` から `release/<version>` へは merge せず、`develop` の最新から **branch cut** する
- `release/<version>` から `main` へは **rebase merge** する（squash merge 禁止）
- `main` へ取り込んだ後、必要に応じて `main` から `develop` へ **backmerge** する
- `Closes #<issue番号>` で Issue と紐付け
- Epic Issue は複数 sub-issue の親として扱い、原則として実装 PR では閉じない
- 実装 PR は Epic の sub-issue を `Closes #<issue番号>` で閉じる

### マージ方式

| 方向 | 方式 | 理由 |
| ---- | ---- | ---- |
| `feature/*` / `fix/*` → `develop` | squash merge | 1 Issue の作業履歴を 1 commit にまとめ、`develop` の履歴を読みやすく保つ |
| `develop` → `release/<version>` | branch cut | リリース候補を固定するだけなので merge commit を作らない |
| `release/<version>` → `main` | rebase merge | release branch の commit を `main` に直列に反映し、squash による履歴分岐を避ける |
| `hotfix/*` → `main` | rebase merge | 緊急修正を `main` に直列に反映する |
| `main` → `develop` | merge commit | release / hotfix / release-please の変更を backmerge として明示する |

### PR タイトル

- 70文字以内、日本語で書く
- コミットタイプを含める（例: `feat: ユーザー認証を追加 (#42)`）

### PR テンプレート

```markdown
## 概要

- <変更内容を箇条書き>

## 関連 Issue

Closes #<issue番号>

## テスト計画

- [ ] フロントエンド: `pnpm vitest run` / `pnpm eslint .` / `pnpm tsc -b --noEmit`
- [ ] バックエンド: `php artisan test` / `./vendor/bin/pint --test` / `./vendor/bin/phpstan analyse`
- [ ] ドキュメント: `git diff --check` と参照確認
- [ ] 対象外の検証がある場合は理由を記載
```

### PR レビューチェックリスト

- [ ] コードが `docs/rules/` の規約に準拠している
- [ ] テストが追加・更新されている
- [ ] 型安全性が確保されている（`any`, 不要な `as` がない）
- [ ] N+1 クエリが発生していない
- [ ] セキュリティ上の問題がない（`docs/rules/security.md` 参照）
- [ ] 不要なファイル（`.env`, ログ, デバッグコード）が含まれていない

## バージョン管理

[release-please](https://github.com/googleapis/release-please) による自動 SemVer 管理を採用する。

### SemVer 算出ルール

Conventional Commits のタイプから自動的にバージョンを算出する。

| コミットタイプ                      | バージョン変化           | 例                               |
| ----------------------------------- | ------------------------ | -------------------------------- |
| `feat`                              | **minor** 上げ (`0.x.0`) | `feat: 検索機能を追加`           |
| `fix`                               | **patch** 上げ (`0.0.x`) | `fix: ログインエラーを修正`      |
| `feat!` / `BREAKING CHANGE:`        | **major** 上げ (`x.0.0`) | `feat!: APIレスポンス形式を変更` |
| `refactor`, `test`, `docs`, `chore` | 変化なし                 | —                                |

### リリースフロー

```
develop で開発 → release/vX.Y.Z を branch cut → main へ rebase merge
                                                              ↓
                                                 release-please が Release PR を自動作成
                                                              ↓
                                                 Release PR をマージ → GitHub Release + git タグ自動作成
                                                              ↓
                                                 main から develop へ backmerge
```

1. `develop` のリリース候補 commit から `release/vX.Y.Z` ブランチを作成する
2. `release/vX.Y.Z` から `main` へ PR を作成し、**rebase merge** で取り込む
3. `main` へのプッシュで `release.yml` が起動
4. release-please が `CHANGELOG.md` を更新し、バージョンバンプを含む **Release PR** を作成
5. Release PR をマージすると GitHub Release とタグ（例: `v1.2.3`）が自動作成される
6. release-please の `CHANGELOG.md` / `.release-please-manifest.json` 変更を `main` から `develop` へ backmerge する

`release/vX.Y.Z` 上でリリース調整の commit を追加した場合も、`main` へ取り込んだ後に `main` から `develop` へ backmerge する。

### 初期バージョン

`0.1.0` からスタート。`1.0.0` は最初の安定リリース時に `feat!` コミットで上げる。

### バージョン確認

`.release-please-manifest.json` で現在のバージョンを管理している。

```json
{
  ".": "0.1.0"
}
```

## シークレット管理（git-secrets）

ローカルでのシークレット漏洩防止に git-secrets を使用する。

### インストール

```bash
# macOS
brew install git-secrets

# Linux
git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets
cd /tmp/git-secrets && sudo make install
```

### セットアップ

```bash
# AWS パターン登録（グローバル）
git secrets --register-aws --global

# リポジトリに hooks を設定
git secrets --install
```

### CI での自動スキャン

`.github/workflows/ci.yml` の `secrets-scan` ジョブで全コミット履歴をスキャンする。
push のたびに自動実行されるため、ローカルでも常に `git secrets --scan` を実行して確認すること。

## ブランチ保護設定（GitHub Settings 推奨設定）

以下を GitHub リポジトリの **Settings > Branches** で設定する。

### `main` ブランチ

| 設定項目                              | 値                                                      |
| ------------------------------------- | ------------------------------------------------------- |
| Require a pull request before merging | ✅                                                      |
| Require approvals                     | 1 以上                                                  |
| Require status checks to pass         | ✅ `CI / Frontend`, `CI / Backend`, `CI / Secrets Scan` |
| Require branches to be up to date     | ✅                                                      |
| Restrict pushes                       | ✅（直接 push 禁止）                                    |

### `develop` ブランチ

| 設定項目                              | 値                                                      |
| ------------------------------------- | ------------------------------------------------------- |
| Require a pull request before merging | ✅                                                      |
| Require status checks to pass         | ✅ `CI / Frontend`, `CI / Backend`, `CI / Secrets Scan` |
| Require branches to be up to date     | ✅                                                      |
