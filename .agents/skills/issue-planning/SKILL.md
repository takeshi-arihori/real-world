---
name: issue-planning
description: >
  GitHub Issue / Epic / sub-issue を作成・分解・整理するスキル。
  「Issueを作って」「後続Issueを切って」「Epicに分けて」「sub issueに分解して」
  「GitHub Projectへ追加して」など、Issue作成やバックログ整理を求められたときに使う。
---

# Issue Planning ワークフロー

GitHub Issue 作成時に、Epic 化、sub-issue 分解、Project field、label、親子関係を整理する。

## 前提

- Issue / Project / Epic 運用の正本は `docs/rules/project.md`
- Label 運用の正本は `docs/labels.md`
- 後続 Epic 候補の正本は `docs/issue-breakdown.md`
- Git Flow / PR 紐付けは `docs/rules/git-flow.md`
- セキュリティ観点は `docs/rules/security.md`

## ワークフロー

### Step 1: 入力と既存Issue確認

- ユーザーの依頼範囲を確認する。
- 既存 Issue と重複しないか `gh issue list` / `gh issue view` で確認する。
- `docs/requirements.md` と関連する `docs/*` を参照し、Issue化する根拠を確認する。

### Step 2: Epic化の判定

次のいずれかなら Epic Issue を作る。

- 複数レイヤー、複数PR、複数レビュー観点に分かれる
- Backend / Frontend / QA など sub-issue に分解できる
- `docs/issue-breakdown.md` の Epic Candidates に該当する

Epic にしない場合でも、既存 Epic の sub-issue にできるか確認する。

### Step 3: Sub-Issue 分解

分解できる場合は、作成前に短い分解案を提示する。

分解軸:

- Backend / Frontend / Infra / QA
- API endpoint / 画面 / feature / Context
- 認証、認可、バリデーション、エラー処理、テスト
- 1 Issue = 1 PR でレビュー可能な単位

### Step 4: Issue本文作成

各 Issue には次を含める。

- 概要
- 背景
- 対応内容
- 受け入れ条件
- テスト観点
- Project / Epic
- 関連: `Parent: #<epic番号>` または `Sub-issues of #<epic番号>`
- 参照 docs

Epic Issue には sub-issue 候補一覧と完了条件を含める。

### Step 5: 作成

Issue 作成は `gh issue create` を使う。

```bash
gh issue create --title "<title>" --body-file <file> --label "<labels>"
```

Project に追加する場合:

```bash
gh issue create --title "<title>" --body-file <file> --label "<labels>" --project "<project-title>"
```

`--project` には `project` scope が必要な場合がある。権限エラー時は `gh auth refresh -s project` を案内する。

### Step 6: Sub-Issue 紐付け

GitHub CLI の `gh issue create` は parent issue 指定を直接サポートしない場合がある。
その場合は REST API で紐付ける。

```bash
sub_issue_id=$(gh api repos/:owner/:repo/issues/<child-number> --jq .id)
gh api -X POST repos/:owner/:repo/issues/<parent-number>/sub_issues -f sub_issue_id="$sub_issue_id"
```

紐付け後、子 Issue の本文にも `Parent: #<parent-number>` を残す。

### Step 7: Project field 設定

Project の custom field は Project 内メタデータなので、Issue 本文にも Epic / Parent を残す。

最低限設定する field:

- `Epic`
- `Priority`
- `Status`
- `Sprint`（決まっている場合）
- `Size` / `Story Point`（見積もる場合）

Project ID / field ID / option ID が不明な場合は、Issue 作成後に「未設定field」としてユーザーに明示する。

### Step 8: 一覧確認

Issue 作成後は、一覧性のため次を確認する。

- Epic Issue に `type: epic` が付いている
- 子 Issue に `Parent: #...` がある
- sub-issue として紐付いている
- Project view では `Parent issue`, `Sub-issue progress`, `Epic` を表示できる

## 注意事項

- 1 Issue = 1 PR を維持する
- Epic Issue は原則として実装PRで閉じない
- Project custom field だけを親子関係の正にしない
- Issue を大量作成する前に、分解案をユーザーへ提示する
