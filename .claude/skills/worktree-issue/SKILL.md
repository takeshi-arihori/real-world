---
name: worktree-issue
description: >
  GitHub Issueを起点にworktree上でタスクを遂行するスキル。
  TDD不要なタスク（ドキュメント変更、設定変更など）をworktreeで隔離実行し、
  commit → push → PR作成まで一貫して行う。
  Git Flow規約（ブランチ命名、Conventional Commits、PR形式）に準拠。
  トリガー: 「Issue #XXX をworktreeで」「worktreeでIssue対応」
  「ドキュメント変更をIssue #XXX で」など、TDD不要のIssue対応を求められたとき。
---

# Worktree Issue ワークフロー

GitHub Issueを起点に、worktree上で実装しPRを作成する。
TDDサイクルが不要なタスク（ドキュメント変更、設定変更など）に適している。

## 前提

- **フロントエンド**: React 19 + TypeScript 5.9 + Vite 8 / リント: ESLint
- **バックエンド**: Laravel 13 + PHP 8.4 / リント: Laravel Pint
- **ルール**: `.claude/rules/` 配下の各ファイルを作業開始前に必ず確認（特に `.claude/rules/security.md`）
- **ディレクトリ**: フロントエンド=`frontend/` / バックエンド=`backend/`

## ワークフロー

### Step 1: Issue確認

```
gh issue view <issue番号>
```

Issueのタイトル・本文・ラベル・コメントを読み取り、実装スコープを把握する。

### Step 2: rulesの確認

`.claude/rules/` ディレクトリ内の関連ルールファイルを確認する。
対象技術スタック（frontend / backend）に応じて該当ファイルを読む。
**`.claude/rules/security.md` は必ず確認する。**

### Step 3: worktree作成・ブランチ切り替え

EnterWorktreeツールを使用してworktreeを作成する。

```
EnterWorktree でworktreeに入る
```

worktree内でブランチを作成:

```bash
git checkout -b feature/#<issue番号>-<issue-slug>
```

- `<issue-slug>`: Issueタイトルから英語kebab-caseで短く生成
- 例: `feature/#42-update-docs`
- developブランチの最新から切ること

### Step 4: 依存関係インストール

worktreeには `node_modules/` や `vendor/` が含まれないため、
変更対象に応じて依存関係をインストールする。

**フロントエンド (`frontend/`) を変更する場合**:
```bash
cd frontend && pnpm install
```

**バックエンド (`backend/`) を変更する場合**:
```bash
cd backend && composer install
```

### Step 5: 実装

Issueの要件に基づき実装を行う。

- `.claude/rules/` の規約に従うこと
- `docs/` に関連する設計書・仕様書があれば参照すること

### Step 6: リント・検証

変更対象に応じてリント・型チェックを実行する。

**フロントエンド**:
```bash
cd frontend && pnpm tsc -b --noEmit   # 型チェック
cd frontend && pnpm eslint .          # リント
```

**バックエンド**:
```bash
cd backend && ./vendor/bin/pint --test  # リント
```

**テストが存在する場合は実行する**:
```bash
# フロントエンド
cd frontend && pnpm vitest run

# バックエンド
cd backend && php artisan test
```

失敗があれば修正し、全てパスするまで繰り返す。

### Step 7: コミット・プッシュ

```bash
git add <変更ファイル>
git commit -m "<type>: <説明>"
git push -u origin <ブランチ名>
```

- コミットメッセージは Conventional Commits 形式。`type` / `scope` は英字、説明は日本語で書く
- 複数コミットOK（内容に応じて分けてよい）

### Step 8: PR作成

```bash
gh pr create --title "<タイトル>" --body "$(cat <<'EOF'
## 概要
- <変更内容を箇条書き>

## 関連 Issue
Closes #<issue番号>

## テスト計画
- [ ] リントパス
- [ ] 型チェックパス（該当する場合）
- [ ] 既存テストへの影響なし

Claude Codeで生成
EOF
)"
```

- PRタイトルは70文字以内、日本語で書く
- `Closes #<issue番号>` でIssueと紐付け
- マージ方針: squash merge

### Step 9: worktreeクリーンアップ

ExitWorktreeツールを使用してworktreeから退出する。

```
ExitWorktree でworktreeを退出・クリーンアップ
```

## 注意事項

- 1 Issue = 1 PR を厳守
- リントが通らない状態でPRを作成しない
- `.claude/rules/` のルールに従うこと
- `docs/` に関連する設計書・仕様書があれば参照すること
- worktreeは作業完了後に必ずクリーンアップすること
