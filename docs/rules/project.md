# GitHub Project / Issue 運用ルール

GitHub Issue と GitHub Projects で、Epic、sub-issue、Project custom field を使って機能単位の計画と進捗を管理する。

## 基本方針

- 機能単位の大きなまとまりは Epic Issue として作成する。
- Epic に含まれる実装・テスト・ドキュメント作業は sub-issue として切り分ける。
- 実際の親子関係は GitHub Issues の sub-issues を正とする。
- GitHub Projects の custom field は一覧性、grouping、filtering、sprint 管理のために使う。
- Epic 候補と実装順の正本は `docs/issue-breakdown.md` とする。

## GitHub CLI 実行ルール

Issue、PR、sub-issue、GitHub Projects の読み取り・作成・編集では、GitHub 上の状態を正として扱う。
`gh issue`、`gh pr`、`gh api` を使う場合は、`docs/ai/harness.md` の Codex sandbox 方針に従う。

### sandbox 内で失敗した場合

Codex sandbox では macOS keyring や外部ネットワークへアクセスできず、認証済みのユーザー端末と同じ `gh` コマンドでも失敗することがある。
次のような失敗は、権限不足の一般論ではなく sandbox 境界として切り分ける。

- keyring にアクセスできず、`gh auth status` や `gh issue view` が未認証扱いになる。
- host resolution、network access、TLS、API 到達性のエラーで `gh issue`、`gh pr`、`gh api` が失敗する。
- `.git` や credential 周辺へのアクセスが sandbox 制約で拒否される。

この場合は、実行したい操作、対象 Issue / PR / Project、必要な理由を明示し、sandbox 外実行の許可を得てから再実行する。
sudo / root 権限、root ユーザーの keyring、個人 access token の shell export で回避しない。

### 認証情報の扱い

- `GH_TOKEN` / `GITHUB_TOKEN` を shell config、`.env`、git 管理ファイル、Issue / PR 本文、ログへ直書きしない。
- `gh auth login` によるユーザーセッションの keyring 認証を使う。
- token 値、secret 値、cookie、credential helper の実体を表示、転記、コミットしない。
- 認証状態を確認するときも、成功 / 失敗と必要な scope の有無だけを扱う。

### 操作前チェック

GitHub API を作成・編集系で使う前に、次を確認する。

- 対象 repository、Issue / PR 番号、Project が意図したものか。
- labels、parent issue、Project field、milestone などの変更対象が `docs/labels.md` とこの文書に沿っているか。
- 1 Issue = 1 PR の原則を崩していないか。
- 失敗時のログや PR 本文に secret 値を含めていないか。

## Epic Issue

Epic Issue は、複数 Issue に分割される機能単位の親 Issue として扱う。

### Epic の作成基準

次のいずれかに当てはまる場合は Epic Issue を作る。

- Backend / Frontend / QA など複数レイヤーにまたがる
- 1 PR で完了させるには大きすぎる
- 認証、記事、プロフィールなど、ユーザー価値としてまとまりがある
- 実装順や依存関係を管理したい

### Epic に含める内容

- 目的
- スコープ
- 対象外
- sub-issue 候補
- 完了条件
- 依存 Epic / 依存 Issue
- 参照する `docs/` 文書

### Epic タイトル

```text
epic: <機能名>
```

例:

```text
epic: Identity Context を実装する
epic: Publishing Context を実装する
```

## Sub-Issue 分解

Issue 作成時に、sub-issue へ分解できるかを必ず確認する。

### 分解する基準

次の境界で分ける。

- Backend と Frontend
- API endpoint / 画面 / QA
- Context や feature
- Red / Green / Refactor の実装単位
- 認証・認可・バリデーションなどレビュー観点が異なる単位

### 分解しない基準

次の場合は単一 Issue のままでよい。

- docs の小さな修正
- 1 PR で完了し、レビュー観点も単純
- 分割すると依存関係だけが増えて進捗管理が悪くなる

### Sub-Issue タイトル

```text
<type>: <対象>を<作業内容>
```

例:

```text
feat: 登録・ログインAPIを実装する
feat: Auth Providerと認証フォームを実装する
test: Identity ContextのAPI契約テストを補強する
```

## GitHub Projects Fields

Project には次の field を用意する。

| Field | Type | 用途 |
| --- | --- | --- |
| `Epic` | Single select | 機能単位の分類。Board や Table で group by する |
| `Parent issue` | Built-in | GitHub sub-issue の親 Issue を表示する |
| `Sub-issue progress` | Built-in | Epic / 親 Issue の進捗を表示する |
| `Sprint` | Iteration | 期間単位の計画に使う |
| `Priority` | Single select | `P0`, `P1`, `P2`, `No Priority` など |
| `Size` | Single select | `XS`, `S`, `M`, `L`, `XL` など |
| `Story Point` | Number | 見積もりが必要な場合のみ使う |
| `Start date` | Date | 着手予定日 |
| `End date` | Date | 完了予定日 |

### Epic field の候補

`Epic` field の候補は `docs/issue-breakdown.md` の Epic Candidates に合わせる。

- Backend Foundation
- Frontend Foundation
- Identity Context
- Publishing Context
- Social Context
- API Integration
- E2E / Quality

必要になった場合のみ追加し、追加時は `docs/issue-breakdown.md` も更新する。

## Recommended Project Views

### Epic Board

- Layout: Board
- Columns: `Status`
- Group by: `Epic`
- Purpose: 機能単位ごとの進捗把握

### Hierarchy Table

- Layout: Table
- Visible fields: `Parent issue`, `Sub-issue progress`, `Epic`, `Priority`, `Sprint`, `Status`
- Group by: `Parent issue`
- Purpose: 親子関係の確認

### Current Sprint

- Layout: Board or Table
- Filter: current `Sprint`
- Group by: `Priority` or `Epic`
- Purpose: 現在のスプリント内の優先度と進捗確認

### Backlog by Epic

- Layout: Table
- Filter: `Status` is not `Done`
- Group by: `Epic`
- Purpose: Epic ごとの未完了作業確認

## Issue 一覧で親子関係が見えにくい場合

GitHub の通常 Issue 一覧では、Project field や sub-issue 階層が十分に見えないことがある。
そのため、次の運用で補う。

- Epic Issue には `type: epic` label を付ける。
- Epic Issue の本文に sub-issue 一覧を残す。
- 子 Issue の本文に `Parent: #<epic番号>` を書く。
- 子 Issue は GitHub の sub-issue として Epic Issue に紐付ける。
- Project の `Hierarchy Table` view を親子確認の正本にする。
- Issue 検索では `label:"type: epic"` や `parent-issue:<owner>/<repo>#<issue番号>` を使う。

## Issue 作成時のチェックリスト

- [ ] Epic Issue にすべきか確認した
- [ ] sub-issue に分割できるか確認した
- [ ] `Epic` field を設定した
- [ ] 必要なら `Parent issue` を設定した
- [ ] `Priority` と `Status` を設定した
- [ ] labels は `docs/labels.md` に従った
- [ ] 参照すべき `docs/` 文書を本文に書いた
- [ ] セキュリティ、認可、バリデーション、テスト観点を受け入れ条件に含めた

## 注意点

- Project custom field は Project 内のメタデータであり、Issue 本体の親子関係の代替にはしない。
- Epic field と label は一覧性の補助として使い、親子関係は sub-issues で管理する。
- 1 Issue = 1 PR の原則は維持する。Epic Issue 自体は原則として実装 PR では閉じず、sub-issue 完了で閉じる。
