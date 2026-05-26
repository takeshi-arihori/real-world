# Ubiquitous Language（ユビキタス言語）定義

RealWorld（Conduit）仕様に基づく、プロジェクト全体で統一して使用する用語を定義する。

コード（クラス名・メソッド名・変数名）、ドキュメント、会話のすべてにおいて、ここで定義された用語を一貫して使用すること。

---

## 用語一覧

### Identity Context

| 用語 | 定義 | 使用ルール |
|------|------|-----------|
| **User** | システムに登録された認証済みユーザー。email と username で一意に識別される | `Account`, `Member` は使わない。常に `User` を使う |
| **Email** | ユーザーのメールアドレス。ログイン識別子として使用する | `mail`, `emailAddress` は使わない |
| **Username** | ユーザーの表示名。プロフィール URL の識別子としても使用する | `name`, `displayName`, `handle` は使わない |
| **Password** | ユーザーの認証パスワード。システム内では常にハッシュ化して保持する | `pass`, `pwd` は使わない |
| **Bio** | ユーザーの自己紹介テキスト | `biography`, `description`, `about` は使わない |
| **Image** | ユーザーのアバター画像 URL | `avatar`, `photo`, `picture` は使わない |
| **Token** | Public RealWorld API の認証トークン（JWT）。Public ログイン・登録時に発行される | `authKey` は使わない |
| **BrowserSession** | First-party frontend 用の server-side session。JWT を browser に公開せず opaque cookie で識別する | `browserToken` は使わない |

### Publishing Context

| 用語 | 定義 | 使用ルール |
|------|------|-----------|
| **Article** | ユーザーが投稿するコンテンツ。タイトル・本文・説明・タグを持つ | `Post`, `Entry`, `Blog` は使わない。常に `Article` を使う |
| **Slug** | Article のタイトルから生成される URL セーフな一意識別子 | `permalink`, `urlId` は使わない |
| **Title** | Article の表題 | Article のコンテキストでは `ArticleTitle` (ValueObject) として扱う |
| **Description** | Article の要約・概要文 | `summary`, `excerpt` は使わない |
| **Body** | Article の本文コンテンツ | `content`, `text` は使わない |
| **Tag** | Article を分類するためのラベル。Article に複数付与できる | `category`, `label`, `topic` は使わない |
| **TagList** | Article に付与された Tag の集合 | `tags`, `categories` 等の曖昧な名前は API 互換以外で使わない |
| **Comment** | Article に対するユーザーのコメント | `reply`, `response`, `note` は使わない |
| **Author** | Article または Comment を作成した User | 記事・コメントの作成者を指す場合に限り使用する。`writer`, `creator`, `poster` は使わない |

### Social Context

| 用語 | 定義 | 使用ルール |
|------|------|-----------|
| **Profile** | User の公開情報（username, bio, image, following 状態） | `UserProfile`, `PublicUser` は使わない |
| **Follow** | あるユーザーが別のユーザーをフォローする関係 | `Subscribe`, `Watch` は使わない。動詞としても `follow` / `unfollow` を使う |
| **Favorite** | ユーザーが Article をお気に入りに登録する行為・関係 | `Like`, `Bookmark`, `Star` は使わない。動詞としても `favorite` / `unfavorite` を使う |
| **Feed** | 現在のユーザーがフォローしているユーザーの Article の時系列一覧 | `Timeline`, `Stream` は使わない |
| **FavoritesCount** | Article がお気に入りに登録された回数 | `likeCount`, `stars` は使わない |
| **Following** | 現在のユーザーが対象ユーザーをフォローしているかどうかの状態（boolean） | Profile のフィールドとして使用する |

---

## 禁止事項

### 1. 同義語の乱立禁止

上記の用語表で「使わない」と指定された同義語をコード・ドキュメントで使用してはならない。

```
# Bad
$account = Account::find($id);      // Account ではなく User
$post->likes()->count();             // likes ではなく favorites
$user->subscribers;                  // subscribers ではなく followers

# Good
$user = User::find($id);
$article->favorites()->count();
$user->followers;
```

### 2. API 都合の語彙を Domain に持ち込まない

API のリクエスト/レスポンス形式で使われるフィールド名（例: `tagList`）と Domain の用語は区別する。

- API 層のフィールド名は RealWorld 仕様に従う（互換性のため）
- Domain 層では本ドキュメントの用語定義に従う
- 変換は Presentation 層（JsonResource / FormRequest）で行う

```php
// Domain 層 — Domain の用語を使う
final readonly class Article
{
    /** @param list<Tag> $tags */
    public function __construct(
        public ArticleTitle $title,
        public Slug $slug,
        public ArticleBody $body,
        public ArticleDescription $description,
        public array $tags,  // Domain では "tags"
    ) {}
}

// Presentation 層 — API 仕様に合わせて変換する
class ArticleResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'slug' => $this->slug->value,
            'title' => $this->title->value,
            'body' => $this->body->value,
            'description' => $this->description->value,
            'tagList' => $this->tags,  // API 仕様では "tagList"
        ];
    }
}
```

### 3. 技術用語と Domain 用語の混同禁止

技術的な概念をドメイン用語として使わない。

| 技術用語（使わない） | Domain 用語（使う） |
|-------------------|-------------------|
| `UserEntity` | `User` |
| `ArticleModel` | `Article` |
| `CommentRecord` | `Comment` |
| `TagDTO` | `Tag`（DTO の場合は `CreateArticleDto` のように操作名を含める） |

### 4. 略語の禁止

Domain 層のクラス名・メソッド名で略語を使わない。

| 略語（使わない） | 正式名（使う） |
|----------------|--------------|
| `desc` | `description` |
| `img` | `image` |
| `usr` | `user` |
| `auth` | `authentication` / `authorization`（文脈に応じて使い分ける） |
| `fav` | `favorite` |
| `pwd` | `password` |

---

## 用語の追加・変更ルール

1. 新しいドメイン用語が必要になった場合、本ドキュメントに追加してからコードに反映する
2. 既存の用語を変更する場合、本ドキュメントを更新し、コード全体を一括でリネームする
3. 判断に迷う場合は、本ドキュメントに用語の定義と判断理由を追記する
