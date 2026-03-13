---
name: tdd-issue
description: >
  GitHub Issueを起点にTDD（テスト駆動開発）でタスクを遂行するスキル。
  Git Flowベースでブランチを作成し、Red→Green→Refactorサイクルで実装し、
  テスト・リントを通してからPRを作成する。
  トリガー: 「Issue #XXX をTDDで」「このIssueをやって」「GHビューでIssue#XXX」
  など、GitHub IssueベースのTDD開発を求められたとき。
---

# TDD Issue ワークフロー

GitHub Issueを起点に、TDDサイクルで実装しPRを作成する。

## 前提

- **言語/FW**: TypeScript 5 + Vue 3 (Composition API, `<script setup>`) / Laravel 12 + PHP 8.3
- **テスト**: フロントエンド=Vitest / バックエンド=Pest 4.4
- **リント**: フロントエンド=ESLint / バックエンド=Laravel Pint
- **ルール**: `rules/` 配下の各ファイルを必ず確認してから作業開始すること
- **ディレクトリ**: フロントエンド=`web/` / バックエンド=`api/`

## ワークフロー

### Step 1: Issue確認

```
gh issue view <issue番号>
```

Issueのタイトル・本文・ラベルを読み取り、実装スコープを把握する。

### Step 2: rulesの確認

`rules/` ディレクトリ内の関連ルールファイルを確認する。
対象技術スタック（frontend / backend）に応じて該当ファイルを読む。

### Step 3: ブランチ作成

```
git checkout -b feature/#<issue番号>-<issue-slug>
```

- `<issue-slug>`: Issueタイトルから英語kebab-caseで短く生成
- 例: `feature/#42-add-user-auth`
- mainブランチの最新から切ること

### Step 4: Red - テスト作成（失敗するテストを書く）

Issueの要件に基づきテストを先に作成する。

**バックエンド (Pest)**:
- `api/tests/Feature/` または `api/tests/Unit/` に配置
- `php artisan test --filter=<テスト名>` で実行し、**失敗を確認**

**フロントエンド (Vitest)**:
- `web/src/**/__tests__/` または `web/src/**/*.test.ts` に配置
- `npx vitest run --reporter=verbose <テストファイル>` で実行し、**失敗を確認**

失敗出力をユーザーに提示し、Red状態であることを明示する。

### Step 5: Green - 実装（テストを通す最小限のコード）

テストを通すために必要最小限の実装を行う。

- 過度な実装をしない（YAGNIの原則）
- テストを再実行し、**全てパスすることを確認**

### Step 6: Refactor（必要に応じて）

テストがグリーンの状態を維持しながら、コードを整理する。
不要であればスキップしてよい。

### Step 7: テスト・リント全体実行

全テスト・リントを実行し、既存コードへの影響がないことを確認する。

**バックエンド**:
```bash
cd api && php artisan test
cd api && ./vendor/bin/pint --test
```

**フロントエンド**:
```bash
cd web && npx vitest run
cd web && npx eslint .
```

失敗があれば修正し、全てパスするまで繰り返す。

### Step 8: コミット・プッシュ

```bash
git add <変更ファイル>
git commit -m "<type>: <説明>"
git push -u origin <ブランチ名>
```

- コミットメッセージは英語、Conventional Commits形式
- 複数コミットOK（テスト追加、実装、リファクタ等で分けてよい）

### Step 9: PR作成

```bash
gh pr create --title "<タイトル>" --body "$(cat <<'EOF'
## Summary
- <変更内容を箇条書き>

## Issue
Closes #<issue番号>

## Test plan
- [ ] Pest テストパス
- [ ] Vitest テストパス
- [ ] Pint リントパス
- [ ] ESLint リントパス

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- PRタイトルは70文字以内
- `Closes #<issue番号>` でIssueと紐付け
- マージ方針: squash merge

## 注意事項

- 1 Issue = 1 PR を厳守
- テストが通らない状態でPRを作成しない
- `rules/` のルールに従うこと
- `docs/` に関連する設計書・仕様書があれば参照すること
