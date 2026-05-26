# RealWorld Ubiquitous Language

> Issue: #34
> Status: 初版

この文書は RealWorld MVP の要件、設計、コード、Issue、レビューで使うドメイン用語を定義する。
実装時はここにある英語名をクラス名、メソッド名、API 名、Frontend feature 名の基準にする。

## Naming Principles

1. RealWorld API 互換で使われる語彙を尊重する。
2. Domain 層では業務上の意味を優先し、技術都合の接尾辞を避ける。
3. API フィールド名と Domain 用語がずれる場合は Presentation 層で変換する。
4. 同じ概念に複数の英語名を使わない。
5. 略語を避け、検索しやすい正式名を使う。

## Identity Terms

| Term | Definition | Use | Avoid |
| --- | --- | --- | --- |
| User | システムに登録された認証主体。email と username で一意に識別される | Domain entity, authenticated actor | Account, Member |
| Email | User のメールアドレス。ログイン識別子として使う | ValueObject, validation field | Mail, EmailAddress |
| Username | User の公開識別子。プロフィール URL でも使う | ValueObject, route parameter | Name, DisplayName, Handle |
| Password | User の認証に使う秘密情報。保存時は必ずハッシュ化する | ValueObject, credential input | Pass, Pwd |
| Token | Public RealWorld API が発行する JWT。external client が `Authorization: Token <token>` で送信する | Public API response/header | AuthKey |
| BrowserSession | First-party frontend を認証する server-side session。opaque cookie で識別し JWT を browser に公開しない | Browser session adapter, AuthProvider refresh | BrowserToken |
| Bio | User の自己紹介文。Profile に表示する公開情報 | User setting, Profile field | Biography, About |
| Image | User のアバター画像 URL。Profile に表示する公開情報 | User setting, Profile field | Avatar, Photo, Picture |

## Publishing Terms

| Term | Definition | Use | Avoid |
| --- | --- | --- | --- |
| Article | User が公開する投稿コンテンツ。title、description、body、tagList を持つ | Aggregate root, page/resource name | Post, Entry, Blog |
| Slug | Article を URL 上で識別する一意な文字列。title から生成する | ValueObject, route parameter | Permalink, UrlId |
| Title | Article の表題 | ArticleTitle ValueObject | Name |
| Description | Article の要約文 | ArticleDescription ValueObject | Summary, Excerpt |
| Body | Article の本文 | ArticleBody ValueObject | Content, Text |
| Tag | Article を分類するラベル | Tag value/entity | Category, Topic, Label |
| TagList | API 上で Article に紐づく Tag の配列を表すフィールド名 | Request/response field | Categories |
| Comment | Article に対する User のコメント | Entity, resource name | Reply, Response, Note |
| Author | Article または Comment を作成した User | Response field, ownership check | Writer, Creator, Poster |

## Social Terms

| Term | Definition | Use | Avoid |
| --- | --- | --- | --- |
| Profile | User の公開プロフィール。username、bio、image、following を含む | Read model, page/resource name | UserProfile, PublicUser |
| Follow | ある User が別の User を購読する関係 | Entity, command verb | Subscribe, Watch |
| Following | 現在 User が対象 Profile を Follow している状態 | Profile boolean field | IsSubscribed |
| Favorite | User が Article をお気に入り登録する関係 | Entity, command verb | Like, Bookmark, Star |
| Favorited | 現在 User が対象 Article を Favorite している状態 | Article boolean field | Liked, Bookmarked |
| FavoritesCount | Article が Favorite された数 | Article response field | LikeCount, Stars |
| Feed | 現在 User が Follow している Author の Article 一覧 | Query result, page/resource name | Timeline, Stream |

## Important Distinctions

### User vs Profile

User は Identity Context の認証主体であり、email、password、Public API token など非公開情報を含む。
Profile は Social Context の公開表示であり、username、bio、image、following だけを扱う。

実装上の判断:

- 登録、ログイン、現在ユーザー取得、設定更新は User として扱う。
- 他者から見える公開情報と following 判定は Profile として扱う。
- Profile から password や token にアクセスしない。

### Favorite vs Like

RealWorld 仕様では Article への好意的な操作を Favorite と呼ぶ。
Like、Bookmark、Star は使わない。

実装上の判断:

- API パスは `/articles/{slug}/favorite` に揃える。
- Domain では Favorite entity / favorite command と命名する。
- UI 表示文言も、お気に入り登録/解除に揃える。

### Feed vs Article List

Article List は条件に合う Article の一般的な一覧である。
Feed は現在 User が Follow している Author の Article に限定された一覧である。

実装上の判断:

- `/api/articles` は Article List。
- `/api/articles/feed` は Feed。
- Feed は認証必須であり、ゲストには提供しない。

### Author vs User

User は登録済みユーザー一般を指す。
Author は Article または Comment を作成した User を、そのコンテンツとの関係で呼ぶ名前である。

実装上の判断:

- Article / Comment のレスポンスでは `author` を使う。
- 認証主体や所有者判定の入力では User を使う。
- Author という独立した集約は作らない。

### Tag vs Category

Tag は Article に複数付与できる分類ラベルである。
Category のような階層分類は MVP 対象外である。

実装上の判断:

- Domain 用語は Tag。
- RealWorld API の配列フィールドは `tagList`。
- 階層、色、説明文などの Category 的な属性は初版 MVP では持たない。

## API Field Mapping

| API field | Domain term | Notes |
| --- | --- | --- |
| `user` | User | 登録、ログイン、現在ユーザー、設定更新の response wrapper |
| `profile` | Profile | 公開プロフィールの response wrapper |
| `article` | Article | 単一 Article の response wrapper |
| `articles` | Article List / Feed | 一覧 API の response wrapper |
| `tagList` | Tags | Domain では Tag の集合、API では RealWorld 互換の `tagList` |
| `favorited` | Favorited | 現在 User 視点の状態 |
| `favoritesCount` | FavoritesCount | Article 単位の Favorite 数 |
| `following` | Following | 現在 User 視点の Profile 状態 |

## Backend Naming Guidance

| Layer | Naming example | Rule |
| --- | --- | --- |
| Domain Entity | `User`, `Article`, `Comment`, `Favorite`, `Follow` | 技術接尾辞を付けない |
| ValueObject | `Email`, `Username`, `Slug`, `ArticleTitle` | プリミティブに意味を与える |
| Command | `RegisterUserCommand`, `CreateArticleCommand`, `FavoriteArticleCommand` | 操作 + 対象 |
| Query | `GetProfileQuery`, `ListArticlesQuery`, `GetFeedQuery` | 読み取り対象を明示する |
| DTO | `CreateArticleDto`, `UpdateUserDto` | 操作 + 対象 + `Dto` |
| Resource | `UserResource`, `ProfileResource`, `ArticleResource` | API response wrapper に対応する |

## Frontend Naming Guidance

| Feature | Responsibility | Main terms |
| --- | --- | --- |
| `auth` | Login, Register, current User, settings update | User, Email, Password, BrowserSession |
| `article` | Article list, detail, editor | Article, Slug, Author, TagList |
| `comment` | Comment list, create, delete | Comment, Author |
| `profile` | Profile view and profile favorites page | Profile, Following |
| `favorite` | Favorite / Unfavorite actions | Favorite, Favorited, FavoritesCount |
| `feed` | Personal feed | Feed, Article |
| `tag` | Tag list and tag filtering | Tag, TagList |

## Prohibited Synonyms

| Do not use | Use instead |
| --- | --- |
| Account, Member | User |
| Post, Entry, Blog | Article |
| Like, Bookmark, Star | Favorite |
| Subscribe, Watch | Follow |
| Timeline, Stream | Feed |
| Category, Topic | Tag |
| Writer, Creator, Poster | Author |
| Avatar, Photo, Picture | Image |

## Security Notes

- Password は平文で保存しない。ログ、API response、他 Context へ出さない。
- Token は Public API の external client 向け契約に限定し、ハードコードやログ出力をしない。
- First-party frontend は BrowserSession を利用し、JWT、session identifier、refresh token を JavaScript から読める storage / state に保存しない。
- User の email は Profile には含めない。
- Frontend のバリデーションは UI フィードバック目的であり、Backend の FormRequest を正にする。
- Article / Comment の Author 判定、Follow / Favorite の認証チェックは Backend で必ず行う。

## Change Rule

新しい用語を追加する場合は、コードに入れる前にこの文書へ定義、使う場所、避ける同義語を追加する。
既存用語を変更する場合は、Domain、API、Frontend feature、Issue の影響範囲を確認して一括で更新する。
