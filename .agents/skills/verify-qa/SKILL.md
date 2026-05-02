---
name: verify-qa
description: >
  型チェック・テスト・リント・セキュリティチェックを一括実行するQA検証スキル。
  PR作成前やコード変更後の品質確認に使用する。
  トリガー: 「検証して」「QAして」「PRの準備確認」「チェックして」
---

# QA検証ワークフロー

コード変更後の品質を一括検証する。

## 前提

- **フロントエンド**: `frontend/` - React 19 + TypeScript 5.9 + Vite 8
- **バックエンド**: `backend/` - Laravel 13 + PHP 8.4
- **ルール**: `.Codex/rules/security.md` を必ず確認

## ワークフロー

### Step 1: セキュリティチェック

`.Codex/rules/security.md` を読み、変更内容に以下がないか確認:

- `.env` の変更・コミット
- ハードコーディングされたシークレット
- `eval()`, `exec()`, `dangerouslySetInnerHTML` の無検証使用
- SQL文の文字列結合

### Step 2: フロントエンド検証（`frontend/` に変更がある場合）

```bash
# 型チェック
cd frontend && pnpm tsc -b --noEmit

# テスト実行
cd frontend && pnpm vitest run

# リント実行
cd frontend && pnpm eslint .
```

各ステップの結果を報告する。失敗があれば修正案を提示。

### Step 3: バックエンド検証（`backend/` に変更がある場合）

```bash
# テスト実行
cd backend && php artisan test

# リント確認
cd backend && ./vendor/bin/pint --test
```

各ステップの結果を報告する。失敗があれば修正案を提示。

### Step 4: 依存関係の脆弱性チェック

```bash
# フロントエンド
cd frontend && pnpm audit --audit-level=high

# バックエンド
cd backend && composer audit
```

### Step 5: 結果サマリー

全チェック結果を以下の形式で報告:

```
## QA検証結果

| チェック項目 | 結果 |
|------------|------|
| セキュリティ | OK / NG |
| 型チェック (TS) | OK / NG / skip |
| テスト (Vitest) | OK / NG / skip |
| リント (ESLint) | OK / NG / skip |
| テスト (Pest) | OK / NG / skip |
| リント (Pint) | OK / NG / skip |
| 脆弱性チェック | OK / NG |
```

全て OK の場合はPR作成可能と報告。NG がある場合は修正が必要。
