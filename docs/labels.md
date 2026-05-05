# Label運用ガイド

GitHub Issues / Pull Requests で使う Label の分類、意図、付け方をまとめる。
Issue 作成時や PR 作成時に、作業の種類、対象領域、優先度、状態を明示して、後から探しやすくすることを目的とする。

## 目的

- Issue / PR の種類を明確にする
- Backend / Frontend / DDD / API など、作業対象の領域を明確にする
- 優先度を判断しやすくする
- 着手可能か、議論中か、ブロック中かを判断しやすくする
- GitHub Issues / Pull Requests / Projects でフィルタリングしやすくする

## Label分類

```text
type: 作業の種類
area: 作業対象の領域
priority: 優先度
status: 作業状態
```

## type Labels

| Label | 意図 |
| --- | --- |
| `type: docs` | ドキュメント作成・更新に関するIssue / PR |
| `type: planning` | 要件整理、設計方針、Issue分解など計画系のIssue / PR |
| `type: feature` | 新機能の実装に関するIssue / PR |
| `type: refactor` | 振る舞いを変えずに内部設計やコード構造を改善するIssue / PR |
| `type: chore` | 設定、環境構築、依存関係更新など機能以外の作業Issue / PR |
| `type: test` | テスト追加・修正・テスト方針に関するIssue / PR |

## area Labels

| Label | 意図 |
| --- | --- |
| `area: requirements` | 要件定義、スコープ整理、受け入れ条件に関するIssue / PR |
| `area: ddd` | DDD、Bounded Context、ユビキタス言語、ドメイン設計に関するIssue / PR |
| `area: backend` | Laravel API、UseCase、Domain、DBなどBackend領域のIssue / PR |
| `area: frontend` | React、画面、ルーティング、UI、状態管理に関するIssue / PR |
| `area: api` | エンドポイント、リクエスト、レスポンス、API仕様に関するIssue / PR |
| `area: auth` | 登録、ログイン、JWT、現在ユーザー取得に関するIssue / PR |
| `area: article` | 記事一覧、記事詳細、記事作成、記事更新、記事削除に関するIssue / PR |
| `area: comment` | コメント一覧、コメント投稿、コメント削除に関するIssue / PR |
| `area: profile` | プロフィール表示、プロフィール更新、公開ユーザー情報に関するIssue / PR |
| `area: social` | フォロー、お気に入り、フィードに関するIssue / PR |
| `area: infra` | Docker、CI/CD、GitHub Actions、環境構築に関するIssue / PR |
| `area: non-functional` | 品質、パフォーマンス、保守性、Lint、Format、開発体験に関するIssue / PR |

## priority Labels

| Label | 意図 |
| --- | --- |
| `priority: high` | 優先度が高く、早めに対応したいIssue / PR |
| `priority: medium` | 通常優先度のIssue / PR |
| `priority: low` | 後回しでも問題ないIssue / PR |

## status Labels

| Label | 意図 |
| --- | --- |
| `status: needs discussion` | 方針や仕様について議論が必要なIssue / PR |
| `status: ready` | 着手可能な状態のIssue / PR |
| `status: blocked` | 他のIssueや決定待ちにより進められないIssue / PR |

## Labelの付け方ルール

### Issue作成時

Issueには、原則として以下を付ける。

```text
type: 1つ以上
area: 1つ以上
priority: 原則1つ
status: 必要に応じて1つ
```

例:

```text
type: docs
area: requirements
priority: high
status: ready
```

### PR作成時

PRには、対応したIssueと同じLabelを基本的に付ける。
ただし、PRの実際の変更内容に応じて `type:` や `area:` を追加・調整してよい。

例:

```text
type: docs
area: ddd
priority: medium
```

## 使用例

### 要件定義書を作成するIssue

```text
type: docs
area: requirements
priority: high
status: ready
```

### DDDのContext Mapを整理するIssue

```text
type: docs
type: planning
area: ddd
priority: medium
status: needs discussion
```

### Laravel APIの認証機能を実装するIssue

```text
type: feature
area: backend
area: api
area: auth
priority: high
status: ready
```

### Reactの画面実装Issue

```text
type: feature
area: frontend
priority: medium
status: ready
```

### DockerやCIの設定Issue

```text
type: chore
area: infra
area: non-functional
priority: medium
```

## 注意点

- `type:` は「何をするか」
- `area:` は「どの領域か」
- `priority:` は「どれくらい優先するか」
- `status:` は「今どういう状態か」
- `area:` は複数付けてもよい
- `priority:` は基本的に1つだけ付ける
- `status:` は状況に応じて更新する
- Labelは完璧に付けることより、後から探しやすくすることを重視する

## 受け入れ条件

- [ ] Label一覧がdocsに追加されている
- [ ] `type:` / `area:` / `priority:` / `status:` の意味が説明されている
- [ ] 各Labelの意図が表形式で整理されている
- [ ] Issue作成時のLabel付与ルールが記載されている
- [ ] PR作成時のLabel付与ルールが記載されている
- [ ] 使用例が記載されている
- [ ] 既存docsやREADMEから参照できる場合はリンクが追加されている
- [ ] アプリケーションコードは変更されていない
