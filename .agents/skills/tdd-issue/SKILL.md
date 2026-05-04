---
name: tdd-issue
description: >
  GitHub Issueを起点にTDD（テスト駆動開発）でタスクを遂行するスキル。
  Issue読み込み→要件整理→設計ドキュメント作成→タスク分解→TDD実装→PR作成の
  一貫したフローで進める。設計ステップをスキップしない。
  worktree（隔離環境）またはlocal（ローカルリポジトリ直接）を選択可能。
  フロントエンド: React 19 + TypeScript 5.9 + Vite 8 / バックエンド: Laravel 13 + PHP 8.4。
  トリガー: 「Issue #XXX をTDDで」「このIssueをやって」「GHビューでIssue#XXX」
  など、GitHub IssueベースのTDD開発を求められたとき。
---

# TDD Issue ワークフロー

GitHub Issueを起点に、要件整理・設計・タスク分解を経てTDDサイクルで実装しPRを作成する。

## 前提

- **フロントエンド**: React 19 + TypeScript 5.9 + Vite 8 / テスト: Vitest + Testing Library / リント: ESLint
- **バックエンド**: Laravel 13 + PHP 8.4 / テスト: Pest 4.4 / リント: Laravel Pint
- **ルール**: `.claude/rules/` 配下の各ファイルを作業開始前に必ず確認（特に `.claude/rules/security.md`）
- **ディレクトリ**: フロントエンド=`frontend/` / バックエンド=`backend/`

## 作業場所の選択

ユーザーの指示またはタスクの性質に応じて作業場所を選択する。

| モード | 説明 | 使い分け |
|--------|------|----------|
| **worktree** | 隔離されたworktree上で作業 | 他の作業に影響を与えたくないとき、並行作業時 |
| **local** | ローカルリポジトリ上で直接作業 | シンプルな変更、既にローカルで作業中のとき |

- ユーザーが明示的に指定した場合はそれに従う
- 指定がない場合はユーザーに確認する

### worktreeモードの場合

Step 4（ブランチ作成）の前にworktreeを作成する:

```
EnterWorktree でworktreeに入る
```

worktreeには `node_modules/` や `vendor/` が含まれないため、
変更対象に応じて依存関係をインストールする:

```bash
# フロントエンド
cd frontend && pnpm install

# バックエンド
cd backend && composer install
```

Step 10のPR作成後にworktreeをクリーンアップする:

```
ExitWorktree でworktreeを退出・クリーンアップ
```

## ワークフロー

### Phase 1: 分析・設計（スキップ禁止）

#### Step 1: Issue確認

```
gh issue view <issue番号>
```

Issueのタイトル・本文・ラベルを読み取り、実装スコープを把握する。

#### Step 2: rulesの確認

`.claude/rules/` ディレクトリ内の関連ルールファイルを確認する。
対象技術スタック（frontend / backend）に応じて該当ファイルを読む。
**`.claude/rules/security.md` は必ず確認する。**

#### Step 3: 要件整理・設計ドキュメント作成

**このステップは必須。設計なしに実装に入らない。**

1. `mkdir -p specs` を実行し、`docs/design/_template-feature-spec.md` テンプレートを元に `specs/<feature>.md` を作成する（`specs/` は gitignored の作業ディレクトリ）
2. 以下のセクションを埋める：
   - **要件の明確化**: 何を実現するか、受け入れ条件
   - **影響範囲**: 対象レイヤー、影響する Bounded Context / Feature
   - **API 設計**: エンドポイント、リクエスト/レスポンス、バリデーション（バックエンド関与時）
   - **ドメインモデル設計**: Entity / ValueObject / Repository（DDD 適用時）
   - **フロントエンド設計**: Feature 構成、コンポーネント分割、状態管理（フロントエンド関与時）
   - **DB 設計**: テーブル、マイグレーション（DB 変更時）
   - **セキュリティ確認**: `.claude/rules/security.md` の禁止事項に抵触しないか
3. **タスク分解**: TDD サイクルのコミット単位でタスクを列挙
4. 設計内容をユーザーに提示し、確認を得てから実装に進む

#### Step 4: ブランチ作成

```
git checkout -b feature/#<issue番号>-<issue-slug>
```

- `<issue-slug>`: Issueタイトルから英語kebab-caseで短く生成
- 例: `feature/#42-add-user-auth`
- developブランチの最新から切ること

### Phase 2: TDD 実装

#### Step 5: Red - テスト作成（失敗するテストを書く）

Issueの要件・設計ドキュメントに基づきテストを先に作成する。

**フロントエンド (Vitest + Testing Library)**:
- `frontend/src/**/__tests__/*.test.tsx` に配置
- コンポーネントテストは `@testing-library/react` + `@testing-library/jest-dom` を使用
- `cd frontend && pnpm vitest run --reporter=verbose <テストファイル>` で実行し、**失敗を確認**

**バックエンド (Pest)**:
- `backend/tests/Feature/` または `backend/tests/Unit/` に配置
- `cd backend && php artisan test --filter=<テスト名>` で実行し、**失敗を確認**

失敗出力をユーザーに提示し、Red状態であることを明示する。

#### Step 6: Green - 実装（テストを通す最小限のコード）

テストを通すために必要最小限の実装を行う。

- 過度な実装をしない（YAGNIの原則）
- テストを再実行し、**全てパスすることを確認**

#### Step 7: Refactor（必要に応じて）

テストがグリーンの状態を維持しながら、コードを整理する。
不要であればスキップしてよい。

### Phase 3: 検証・PR

#### Step 8: テスト・リント全体実行

全テスト・リントを実行し、既存コードへの影響がないことを確認する。

**フロントエンド**:
```bash
cd frontend && pnpm tsc -b --noEmit   # 型チェック
cd frontend && pnpm vitest run         # テスト
cd frontend && pnpm eslint .           # リント
```

**バックエンド**:
```bash
cd backend && php artisan test        # テスト
cd backend && ./vendor/bin/pint --test # リント
cd backend && ./vendor/bin/phpstan analyse  # 静的解析
```

失敗があれば修正し、全てパスするまで繰り返す。

#### Step 9: コミット・プッシュ

```bash
git add <変更ファイル>
git commit -m "<type>: <説明>"
git push -u origin <ブランチ名>
```

- コミットメッセージは英語、Conventional Commits形式
- `Co-Authored-By:` 行は含めない
- TDD サイクルの粒度でコミットを分ける:
  1. `test: add tests for <feature>` (Red)
  2. `feat: implement <feature>` (Green)
  3. `refactor: clean up <feature>` (Refactor、必要な場合のみ)
- `specs/` 配下の作業メモは gitignored のためコミット対象に含めない

#### Step 10: PR作成

```bash
gh pr create --title "<タイトル>" --body "$(cat <<'EOF'
## Summary
- <変更内容を箇条書き>

## Issue
Closes #<issue番号>

## Test plan
- [ ] Vitest テストパス
- [ ] Pest テストパス
- [ ] ESLint リントパス
- [ ] Pint リントパス
EOF
)"
```

- PRタイトルは70文字以内
- `Closes #<issue番号>` でIssueと紐付け
- マージ方針: squash merge

### Step 11: クリーンアップ（worktreeモードの場合）

worktreeモードで作業した場合は、ExitWorktreeでクリーンアップする。

## 注意事項

- 1 Issue = 1 PR を厳守
- **Phase 1（分析・設計）を飛ばして Phase 2（実装）に入らない**
- テストが通らない状態でPRを作成しない
- `.claude/rules/` のルールに従うこと
- `docs/` に関連する設計書・仕様書があれば参照すること

## Issue ラベル運用

| ラベル | 意味 | 付けるタイミング |
|-------|------|----------------|
| `needs-design` | 設計が必要 | Issue 作成時（設計未完了） |
| `ready` | 設計完了・実装可能 | 設計ドキュメントが承認された後 |
| `frontend` | フロントエンド対象 | 影響範囲の特定後 |
| `backend` | バックエンド対象 | 影響範囲の特定後 |
| `fullstack` | フルスタック対象 | 影響範囲の特定後 |
