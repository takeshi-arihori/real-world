# RealWorld Context Map

> Issue: #33
> Status: 初版

この文書は RealWorld MVP を DDD 前提で実装するための Context Map である。
Backend の Domain / Application / Infrastructure / Presentation 分割、Frontend の feature 分割、後続 Issue 分解の判断材料として使う。

## Context Overview

| Context | 責務 | 主要概念 | 主な API 領域 |
| --- | --- | --- | --- |
| Identity | ユーザー登録、ログイン、認証済みユーザー情報の管理 | User, Email, Username, Password, Token | Auth, User |
| Publishing | 記事、コメント、タグのライフサイクル管理 | Article, Slug, Comment, Tag, Author | Article, Comment, Tag |
| Social | 公開プロフィール、フォロー、お気に入り、フィード生成条件の管理 | Profile, Follow, Favorite, Feed | Profile, Follow, Favorite, Feed |

## Identity Context

Identity Context は、システム利用者の本人性と認証状態を管理する。

### 責務

- email、username、password による User 登録
- email と password によるログイン
- 認証トークンの発行、失効、現在ユーザーの特定
- email、username、password、bio、image の更新
- email と username の一意性維持

### 責務外

- 記事、コメント、タグの作成や取得
- フォロー、お気に入り、フィードの生成
- Article や Follow の内部ルール

### 実装境界

- Backend: `Domain/Identity`, `Application/Identity`, `Presentation/Http/*/Identity`
- Frontend: `features/auth`
- 他 Context へ渡す情報は User の識別子と公開可能な表示情報に限定する。

## Publishing Context

Publishing Context は、ユーザーが公開するコンテンツの作成から削除までを管理する。

### 責務

- Article の作成、詳細取得、一覧取得、更新、削除
- Slug の生成と一意性維持
- Article への Tag 付与と Tag 一覧取得
- Article に紐づく Comment の投稿、一覧取得、削除
- Article 作成者だけが更新・削除できるという所有者ルール
- Comment 作成者だけが削除できるという所有者ルール

### 責務外

- User の認証、ログイン、パスワード管理
- Follow 関係や Favorite 関係そのものの管理
- Profile の following 判定

### 実装境界

- Backend: `Domain/Publishing`, `Application/Publishing`, `Presentation/Http/*/Publishing`
- Frontend: `features/article`, `features/comment`, `features/tag`
- Article は author として User ID を保持するが、User の email や password には依存しない。

## Social Context

Social Context は、ユーザー間の関係とユーザーが Article に対して行うソーシャル操作を管理する。

### 責務

- username による Profile 取得
- 現在ユーザーから見た following の判定
- Follow / Unfollow
- Favorite / Unfavorite
- favoritesCount と favorited の算出に必要な関係管理
- Feed の対象となる followee User ID の提供

### 責務外

- User 登録やログイン
- Article 本文、Tag、Comment のライフサイクル管理
- Feed に含める Article レスポンス全体の整形

### 実装境界

- Backend: `Domain/Social`, `Application/Social`, `Presentation/Http/*/Social`
- Frontend: `features/profile`, `features/favorite`, `features/feed`
- Feed API のレスポンス生成では Publishing の Article 読み取り結果と Social の Follow 関係を Application Query で合成する。

## Context Relationships

```text
Identity Context
  |
  | User ID / public profile fields
  v
Publishing Context  <---- Article ID / slug ----  Social Context
  ^                                               |
  |                                               |
  +--------------- author User ID ----------------+
```

| 上流 | 下流 | 関係 | 連携データ | 方針 |
| --- | --- | --- | --- | --- |
| Identity | Publishing | Customer-Supplier | User ID | Publishing は author を User ID として保持し、User の内部構造へ依存しない |
| Identity | Social | Customer-Supplier | User ID, username, bio, image | Social は Profile 表示と Follow 主体のために公開可能な User 情報だけを参照する |
| Publishing | Social | Customer-Supplier | Article ID, slug | Social は Favorite 対象として Article を参照するが、Article 本文の更新ルールは持たない |
| Social | Publishing | Query Collaboration | followee User IDs | Feed 取得では Social が対象 author を決め、Publishing が Article 一覧を返す |

## Cross-Context Rules

1. Context 間で Domain Entity を直接渡さない。
2. Context 間連携は User ID、Article ID、slug、username などの識別子か、公開用 DTO に限定する。
3. 複数 Context の情報を組み合わせる API レスポンスは Application Query または Presentation Resource で組み立てる。
4. Domain 層は他 Context の Repository 実装や Eloquent Model に依存しない。
5. 認証は Identity が担い、操作可否は対象 Context の所有者ルールと Laravel Policy / Gate で表現する。
6. サーバーサイドバリデーションと認可を正とし、Frontend の検証は UI フィードバックに限定する。

## Package Split Guidance

Backend の初期実装では、Context ごとに以下の単位で分割する。

```text
backend/app/
├── Domain/
│   ├── Identity/
│   ├── Publishing/
│   └── Social/
├── Application/
│   ├── Identity/
│   ├── Publishing/
│   └── Social/
├── Infrastructure/
│   └── Persistence/
└── Presentation/
    └── Http/
```

Frontend の feature 分割は Context と完全一致させず、ユーザー操作単位で分ける。

| Context | Frontend feature |
| --- | --- |
| Identity | `auth` |
| Publishing | `article`, `comment`, `tag` |
| Social | `profile`, `favorite`, `feed` |

## Implementation Issue Candidates

Context Map から、Backend / Frontend の後続 Issue は次の単位へ分解する。

- Identity Context: 登録、ログイン、現在ユーザー取得、ユーザー設定更新
- Publishing Context: Article CRUD、Comment API、Tag API
- Social Context: Profile API、Follow API、Favorite API、Feed API
- API composition: RealWorld 互換レスポンス、認証要否、認可、ページング
- Frontend: ルーティング基盤、認証画面、記事画面、プロフィール画面、ソーシャル操作 UI

## Security Notes

- `.env`、シークレット、API キーはこの設計文書にも実装にも含めない。
- パスワードは Identity Context でハッシュ化して保持し、他 Context へ渡さない。
- Article 更新・削除、Comment 削除、Follow、Favorite は認証済みユーザーだけが実行できる。
- Article と Comment の所有者確認は Backend 側で必ず行う。
- SQL 文字列結合は使わず、Eloquent / Query Builder / Repository 経由で実装する。
