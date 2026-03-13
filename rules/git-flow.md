# Git Flow ルール

<!-- TODO: プロジェクト固有のルールを追記 -->

## ブランチ命名規則

- feature/#<issue番号>-<slug> : 機能開発
- fix/#<issue番号>-<slug> : バグ修正
- hotfix/#<issue番号>-<slug> : 緊急修正

## コミット規約

- Conventional Commits 形式
- 例: `feat: add user authentication`, `fix: resolve login redirect`

## PR方針

- 1 Issue = 1 PR
- squash merge
- `Closes #<issue番号>` でIssue紐付け
