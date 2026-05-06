# Bounded Context 定義

RealWorld（Conduit）仕様に基づくドメインの Bounded Context を定義する。

## コンテキスト一覧

| Context | 責務 | 主要エンティティ |
|---------|------|----------------|
| Identity | ユーザー登録・ログイン・認証 | User |
| Publishing | 記事 CRUD・コメント・タグ管理 | Article, Comment, Tag |
| Social | プロフィール・フォロー・お気に入り・フィード | Profile, Follow, Favorite |

---

## 1. Identity Context

### 責務

ユーザーのアイデンティティに関する一切を管理する。

- ユーザー登録（Registration）
- ログイン・認証トークン発行（Authentication）
- ユーザー情報の更新（email, username, password, bio, image）
- 現在のユーザー情報の取得

### 主要エンティティ

| エンティティ | 説明 |
|-------------|------|
| **User** | システム内の認証済みユーザー。email・username で一意に識別される |

### ValueObject 候補

| ValueObject | 理由 |
|------------|------|
| Email | フォーマットバリデーション・一意性制約を持つ。プリミティブ string では表現力不足 |
| Username | 文字種・長さ制約・一意性制約を持つ |
| Password | ハッシュ化ロジック・強度バリデーションを内包する |
| Bio | 長さ制約を持つ任意テキスト（nullable） |
| ImageUrl | URL フォーマットバリデーション（nullable） |

### API エンドポイント対応

| エンドポイント | 操作 |
|--------------|------|
| `POST /api/users` | ユーザー登録 |
| `POST /api/users/login` | ログイン |
| `GET /api/user` | 現在のユーザー取得 |
| `PUT /api/user` | ユーザー情報更新 |

---

## 2. Publishing Context

### 責務

記事のライフサイクルとそれに付随するコンテンツ（コメント・タグ）を管理する。

- 記事の作成・取得・更新・削除（CRUD）
- 記事一覧の取得（フィルタリング: tag, author, favorited）
- コメントの追加・取得・削除
- タグの管理・一覧取得

### 主要エンティティ

| エンティティ | 説明 |
|-------------|------|
| **Article** | 集約ルート。タイトル・本文・タグリストを持ち、slug で一意に識別される |
| **Comment** | Article に従属する。記事へのコメント |
| **Tag** | 記事を分類するためのラベル |

### ValueObject 候補

| ValueObject | 理由 |
|------------|------|
| Slug | タイトルから自動生成。URL セーフな文字列に変換するロジックを内包する |
| ArticleTitle | 空文字禁止・長さ制約のバリデーションを持つ |
| ArticleBody | 空文字禁止のバリデーションを持つ |
| ArticleDescription | 記事の要約。空文字禁止 |
| TagName | タグの名前。正規化（小文字変換等）のロジックを持つ |
| CommentBody | 空文字禁止のバリデーションを持つ |

### 集約境界

- **Article 集約**: Article（集約ルート）+ Comment（子エンティティ）+ Tag（関連）
  - Comment は Article を通じてのみアクセスする
  - Tag は Article との多対多関係で、独立した集約ではない

### API エンドポイント対応

| エンドポイント | 操作 |
|--------------|------|
| `POST /api/articles` | 記事作成 |
| `GET /api/articles` | 記事一覧取得（フィルタ・ページネーション） |
| `GET /api/articles/:slug` | 記事取得 |
| `PUT /api/articles/:slug` | 記事更新 |
| `DELETE /api/articles/:slug` | 記事削除 |
| `POST /api/articles/:slug/comments` | コメント追加 |
| `GET /api/articles/:slug/comments` | コメント一覧取得 |
| `DELETE /api/articles/:slug/comments/:id` | コメント削除 |
| `GET /api/tags` | タグ一覧取得 |

---

## 3. Social Context

### 責務

ユーザー間のソーシャルインタラクションとパーソナライズされたフィードを管理する。

- プロフィールの取得
- ユーザーのフォロー・アンフォロー
- 記事のお気に入り登録・解除
- フォロー中ユーザーの記事フィード取得

### 主要エンティティ

| エンティティ | 説明 |
|-------------|------|
| **Profile** | ユーザーの公開プロフィール。Identity Context の User を参照する |
| **Follow** | ユーザー間のフォロー関係 |
| **Favorite** | ユーザーと記事間のお気に入り関係 |

### API エンドポイント対応

| エンドポイント | 操作 |
|--------------|------|
| `GET /api/profiles/:username` | プロフィール取得 |
| `POST /api/profiles/:username/follow` | フォロー |
| `DELETE /api/profiles/:username/follow` | アンフォロー |
| `POST /api/articles/:slug/favorite` | お気に入り登録 |
| `DELETE /api/articles/:slug/favorite` | お気に入り解除 |
| `GET /api/articles/feed` | フィード取得（フォロー中ユーザーの記事） |

---

## コンテキストマップ

### コンテキスト間の関係

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Identity   │◄────────│      Social      │────────►│  Publishing  │
│   Context    │         │     Context      │         │   Context    │
│              │         │                  │         │              │
│  ・User      │         │  ・Profile       │         │  ・Article   │
│  ・Auth      │         │  ・Follow        │         │  ・Comment   │
│              │         │  ・Favorite      │         │  ・Tag       │
│              │         │  ・Feed          │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘
       ▲                                                      ▲
       │              Identity Context は                       │
       │              User ID を提供する                         │
       │              (上流: Supplier)                          │
       └─────────────────────────────────────────────────────────┘
                    Publishing Context は
                    Article の Author として
                    User ID を参照する
```

### 関係の種類

| 上流 (Supplier) | 下流 (Consumer) | 関係の種類 | 説明 |
|----------------|----------------|-----------|------|
| Identity | Publishing | Customer-Supplier | Article の Author として User ID を参照する。Publishing は Identity の User ID を受け取るが、User の内部構造には依存しない |
| Identity | Social | Customer-Supplier | Profile は User の公開情報を表現する。Follow/Favorite の主体として User ID を参照する |
| Publishing | Social | Customer-Supplier | Favorite の対象として Article ID を参照する。Feed は Article の一覧を返す |

### データ受け渡し方針

1. **コンテキスト間は ID（識別子）のみで連携する**
   - User ID, Article ID など、プリミティブな識別子を受け渡す
   - エンティティオブジェクトを直接渡さない

2. **下流コンテキストは上流の内部構造に依存しない**
   - Publishing Context は User の email やパスワードを知らない
   - Social Context は Article の本文を直接扱わない

3. **API レスポンスの組み立ては Presentation 層で行う**
   - 複数コンテキストのデータを結合する必要がある場合（例: 記事一覧に著者プロフィールを含める）、Presentation 層または Application 層の Query で横断的に取得する
   - Domain 層ではコンテキスト境界を厳密に守る

4. **共有カーネル（Shared Kernel）は設けない**
   - 現時点ではコンテキスト間で共有するドメインロジックはない
   - 将来的に必要になった場合は本ドキュメントへ判断理由を追記する
