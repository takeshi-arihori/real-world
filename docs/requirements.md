# Blog Service 要件定義

> Parent Issue: #2
> Initial Requirement Issue: #32
> ステータス: 詳細計画済み

## 目的

React 19 + Laravel 13 のモノレポ `Blog Service` で、RealWorld（Conduit）相当の API / CRUD / DDD を学ぶための MVP 要件を定義する。
この文書は後続 Issue の分解、設計レビュー、実装範囲確認の正本として扱う。

## Detailed Planning Artifacts

この要件定義の詳細化は次の文書に分割する。
実装 Issue を作るときは、この文書で MVP スコープを確認したうえで、該当する詳細文書を参照する。

| 領域 | 文書 | 対応Issue | 役割 |
| --- | --- | --- | --- |
| DDD | [`context-map.md`](context-map.md) | #33 | Bounded Context、責務、Context 間連携 |
| DDD | [`ubiquitous-language.md`](ubiquitous-language.md) | #34 | ドメイン用語、命名、混同しやすい語の区別 |
| API | [`api-requirements.md`](api-requirements.md) | #35 | RealWorld互換API、認証要否、認可、レスポンス形式 |
| Frontend | [`frontend-features.md`](frontend-features.md) | #36 | 画面一覧、route案、feature構成、フォーム、エラー方針 |
| Non-functional | [`non-functional-requirements.md`](non-functional-requirements.md) | #37 | 品質、テスト、lint、Git hooks、ローカル再現性 |
| Planning | [`issue-breakdown.md`](issue-breakdown.md) | #38 | 後続Epic、Backend / Frontend / QA Issue候補 |

## MVP 対象

MVP では、RealWorld の主要な学習対象である認証、プロフィール、記事、コメント、ソーシャル操作を対象にする。

| 領域 | 対象機能 |
| --- | --- |
| 認証 | ユーザー登録、ログイン、現在ユーザー取得、ユーザー情報更新 |
| プロフィール | 公開プロフィール取得、プロフィール表示情報の更新 |
| 記事 | 記事作成、一覧取得、詳細取得、更新、削除 |
| コメント | コメント投稿、記事ごとのコメント一覧取得、コメント削除 |
| ソーシャル | フォロー、アンフォロー、お気に入り登録、解除、フィード取得 |
| タグ | 記事へのタグ付与、タグ一覧取得 |

## MVP 対象外

初版 MVP では、RealWorld の中核 CRUD と API 契約の学習から外れる機能は対象外にする。

- 管理者画面、管理者ロール、監査ログ
- メール認証、パスワードリセット、多要素認証
- 画像アップロード、画像変換、外部ストレージ連携
- Markdown プレビュー、リッチテキストエディタ
- 通知、検索エンジン連携、レコメンド
- 本番運用向けの高度な監視、SLO、課金、利用制限
- モバイルアプリ、SSR、SEO 最適化

## 想定ユーザー

| ユーザー種別 | 利用範囲 |
| --- | --- |
| ゲスト | 記事一覧、記事詳細、プロフィール、タグ一覧、コメント一覧を閲覧できる |
| 認証済みユーザー | ゲスト機能に加えて、記事作成、記事更新、記事削除、コメント投稿、コメント削除、フォロー、お気に入り、フィード閲覧ができる |
| 記事作成者 | 自分の記事を更新・削除できる。他ユーザーの記事は更新・削除できない |
| コメント作成者 | 自分のコメントを削除できる。他ユーザーのコメントは削除できない |

## 機能要件

### 認証

- ユーザーは email、username、password を指定して登録できる。
- email と username は一意である。
- ユーザーは email と password でログインできる。
- 認証済みユーザーは現在のユーザー情報を取得できる。
- 認証済みユーザーは email、username、password、bio、image を更新できる。
- 認証が必要な操作では、未認証リクエストを拒否する。
- 無効な入力、重複 email、重複 username、誤ったログイン情報はエラーとして扱う。

### プロフィール

- ゲストと認証済みユーザーは username を指定してプロフィールを取得できる。
- プロフィールには username、bio、image、following を含める。
- 認証済みユーザーがプロフィールを取得する場合、following は現在ユーザーが対象ユーザーをフォローしているかを示す。
- ゲストがプロフィールを取得する場合、following は false として扱う。
- 存在しない username はエラーとして扱う。

### 記事

- 認証済みユーザーは title、description、body、tagList を指定して記事を作成できる。
- 記事には slug、title、description、body、tagList、createdAt、updatedAt、favorited、favoritesCount、author を含める。
- slug は記事 title から生成し、記事を一意に識別できる。
- ゲストと認証済みユーザーは記事一覧を取得できる。
- 記事一覧は tag、author、favorited による絞り込みと limit、offset によるページングに対応する。
- ゲストと認証済みユーザーは slug を指定して記事詳細を取得できる。
- 記事作成者は自分の記事を更新・削除できる。
- 記事作成者以外のユーザーによる更新・削除は拒否する。
- 存在しない slug はエラーとして扱う。

### コメント

- ゲストと認証済みユーザーは記事ごとのコメント一覧を取得できる。
- 認証済みユーザーは記事にコメントを投稿できる。
- コメントには id、createdAt、updatedAt、body、author を含める。
- コメント作成者は自分のコメントを削除できる。
- コメント作成者以外のユーザーによる削除は拒否する。
- 存在しない記事またはコメントはエラーとして扱う。

### ソーシャル

- 認証済みユーザーは他ユーザーをフォロー、アンフォローできる。
- 自分自身のフォローは拒否する。
- 認証済みユーザーは記事をお気に入り登録、解除できる。
- 同じユーザーによる同じ記事へのお気に入りは重複登録しない。
- 認証済みユーザーはフォロー中ユーザーの記事フィードを取得できる。
- フィードは limit、offset によるページングに対応する。

### タグ

- 記事作成時、tagList に指定されたタグを記事へ紐付ける。
- ゲストと認証済みユーザーはタグ一覧を取得できる。
- タグ一覧は登録済みタグを重複なしで返す。

## 非機能要件

| 分類 | 要件 |
| --- | --- |
| API 互換性 | RealWorld API の主要なリクエスト / レスポンス構造に合わせる |
| バリデーション | サーバーサイドを正とし、入力不備は一貫したエラー形式で返す |
| 認可 | 更新・削除・フォロー・お気に入りなどの操作は認証と所有者確認を行う |
| セキュリティ | `.env`、シークレット直書き、SQL 文字列結合、危険な動的実行を禁止する |
| アーキテクチャ | Backend は Domain / Application / Infrastructure / Presentation の責務分離を守る |
| フロントエンド | React は `app/`、`features/`、`shared/`、`lib/` の境界を守る |
| テスト | Feature テストで API 契約、Unit テストで業務ルール、Frontend テストでユーザー視点の挙動を確認する |
| 保守性 | ルールや判断は `docs/` の正本に集約し、入口ファイルへ詳細を重複させない |

## 後続 Issue 分解候補

詳細な後続 Issue 分解は [`issue-breakdown.md`](issue-breakdown.md) を正本にする。
初期実装は次の Epic 単位で進める。

1. Backend Foundation
2. Frontend Foundation
3. Identity Context
4. Publishing Context
5. Social Context
6. API Integration
7. E2E / Quality

## Parent Issue Closure Criteria

親 Issue #2 は、次の条件を満たした時点でクローズできる。

- #33 Context Map が作成されている。
- #34 Ubiquitous Language が作成されている。
- #35 API Requirements が作成されている。
- #36 Frontend Features が作成されている。
- #37 Non-Functional Requirements が作成されている。
- #38 Issue Breakdown が作成されている。
- 後続の Backend / Frontend / QA 実装 Issue 候補が整理されている。
- 実装時に参照する正本が `docs/` 配下に集約されている。
