# RealWorld API Requirements

> Issue: #35
> Updated by: #124
> Status: JWT 認証移行方針反映

この文書は Laravel API サーバで RealWorld 互換 API を実装するための API 一覧、認証要否、認可、レスポンス形式、Command / Query 分離方針を定義する。

References:

- https://docs.realworld.show/specifications/backend/endpoints/
- https://docs.realworld.show/specifications/backend/api-response-format/

## Baseline Decisions

- Backend は Laravel 13 + JSON Web Token (JWT) を使って API request を認証する。
- 外部 API 契約は RealWorld 互換を優先し、認証ヘッダーは `Authorization: Token <token>` として扱う。
- JWT は `user.token` に格納する不透明な token 値として外部公開し、client は claim に依存しない。
- Request body と response wrapper は RealWorld 形式に合わせる。
- 入力検証はすべて FormRequest で行う。
- 認可は Policy / Gate、または FormRequest の `authorize()` から呼び出す。
- Controller は薄く保ち、Application 層の Command / Query に委譲する。
- Domain 層は Laravel、HTTP、Eloquent、JWT の発行・検証実装に依存しない。

## Authentication Semantics

| 認証区分 | 意味 | 未認証時 |
| --- | --- | --- |
| Required | 有効なトークンが必須 | `401 Unauthorized` |
| Optional | トークンがあれば現在 User 視点の `following` / `favorited` を計算する | ゲストとして扱い、状態値は `false` |
| None | トークンを使わない | 認証状態に依存しない |

認証済み User の識別子は Application 層へ DTO として渡す。
Domain Entity に HTTP token や JWT payload を渡さない。

Optional endpoint は header がない場合のみゲストとして扱う。
token が送信されたにもかかわらず署名検証に失敗した場合、形式が不正な場合、または期限切れの場合は、ゲストに降格せず `401 Unauthorized` を返す。

## JWT Authentication Policy

JWT は Backend の認証実装であり、外部 API contract の `Token` scheme や response wrapper を変更しない。

| Item | Decision |
| --- | --- |
| External header contract | `Authorization: Token <jwt>` を維持する。`Bearer` scheme へ変更しない |
| User response contract | Register、Login、Current User、Update User の `user.token` に JWT 文字列を返す |
| Signing algorithm | 単一 Backend が発行・検証する初期構成では `HS256` を使用し、検証時に受理する algorithm を固定する |
| Signing secret | `APP_KEY` とは別の十分にランダムな secret を runtime secret management から注入し、Laravel の `config/*` 経由で参照する。実値を `.env`、git 管理ファイル、ログへ記録しない |
| Required claims | `sub` (User identifier)、`iat` (issued at)、`exp` (expiry) を必須とする |
| TTL | 発行時点から `60` 分 |
| Token issuance | Register と Login の成功時に新しい JWT を発行する |
| Authenticated user response | Current User と Update User は request で受理した JWT を返し、暗黙に再発行または有効期限延長をしない |
| Invalid token | 署名不正、形式不正、または期限切れの JWT は `401 Unauthorized` とする |

### Session Lifecycle

- Logout は Frontend が保存した JWT と current User state を破棄する操作とする。今回の API に logout endpoint は追加しない。
- Stateless JWT の server-side revocation list は今回導入しない。logout 前に漏洩した JWT は期限まで使用できるため、短い TTL でリスクを限定する。
- Refresh token、refresh endpoint、silent refresh は対象外とする。期限切れ後はユーザーが再度 login する。
- Frontend は JWT payload を認証状態や期限判定の正本にせず、token を保存・送信し、`401 Unauthorized` を受けた場合に破棄する。

## API Endpoint List

| Area | Method | Path | Auth | Type | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `POST` | `/api/users` | None | Command | `user` | Register |
| Auth | `POST` | `/api/users/login` | None | Command | `user` | Login |
| User | `GET` | `/api/user` | Required | Query | `user` | Current User |
| User | `PUT` | `/api/user` | Required | Command | `user` | Update current User |
| Profile | `GET` | `/api/profiles/{username}` | Optional | Query | `profile` | Public profile |
| Follow | `POST` | `/api/profiles/{username}/follow` | Required | Command | `profile` | Follow target User |
| Follow | `DELETE` | `/api/profiles/{username}/follow` | Required | Command | `profile` | Unfollow target User |
| Article | `GET` | `/api/articles` | Optional | Query | `articles` | Global list, filters and pagination |
| Feed | `GET` | `/api/articles/feed` | Required | Query | `articles` | Followee author list |
| Article | `POST` | `/api/articles` | Required | Command | `article` | Create Article |
| Article | `GET` | `/api/articles/{slug}` | Optional | Query | `article` | Article detail |
| Article | `PUT` | `/api/articles/{slug}` | Required | Command | `article` | Author only |
| Article | `DELETE` | `/api/articles/{slug}` | Required | Command | empty | Author only |
| Comment | `GET` | `/api/articles/{slug}/comments` | Optional | Query | `comments` | Article comments |
| Comment | `POST` | `/api/articles/{slug}/comments` | Required | Command | `comment` | Add comment |
| Comment | `DELETE` | `/api/articles/{slug}/comments/{id}` | Required | Command | empty | Comment author only |
| Favorite | `POST` | `/api/articles/{slug}/favorite` | Required | Command | `article` | Favorite Article |
| Favorite | `DELETE` | `/api/articles/{slug}/favorite` | Required | Command | `article` | Unfavorite Article |
| Tag | `GET` | `/api/tags` | None | Query | `tags` | Distinct tag list |

## Request Contracts

### Register

```json
{
  "user": {
    "username": "jake",
    "email": "jake@example.com",
    "password": "secret"
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `user.username` | required, string, unique, max length |
| `user.email` | required, email, unique, max length |
| `user.password` | required, string, minimum length |

### Login

```json
{
  "user": {
    "email": "jake@example.com",
    "password": "secret"
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `user.email` | required, email |
| `user.password` | required, string |

### Update User

```json
{
  "user": {
    "email": "jake@example.com",
    "username": "jake",
    "password": "new-secret",
    "bio": "I like APIs",
    "image": "https://example.com/avatar.png"
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `user.email` | sometimes, email, unique except current User |
| `user.username` | sometimes, string, unique except current User |
| `user.password` | sometimes, string, minimum length |
| `user.bio` | nullable, string, max length |
| `user.image` | nullable, url, max length |

### Create Article

```json
{
  "article": {
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe",
    "tagList": ["dragons", "training"]
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `article.title` | required, string, max length |
| `article.description` | required, string, max length |
| `article.body` | required, string |
| `article.tagList` | sometimes, array |
| `article.tagList.*` | string, max length |

### Update Article

```json
{
  "article": {
    "title": "Did you train your dragon?",
    "description": "Updated summary",
    "body": "Updated body"
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `article.title` | sometimes, string, max length |
| `article.description` | sometimes, string, max length |
| `article.body` | sometimes, string |

If `title` changes, `slug` is regenerated and remains unique.

### Add Comment

```json
{
  "comment": {
    "body": "Nice article"
  }
}
```

Validation:

| Field | Rule |
| --- | --- |
| `comment.body` | required, string |

### List Query Parameters

| Endpoint | Parameter | Rule | Notes |
| --- | --- | --- | --- |
| `/api/articles` | `tag` | optional, string | Filter by Tag |
| `/api/articles` | `author` | optional, string | Filter by Author username |
| `/api/articles` | `favorited` | optional, string | Filter by username that favorited |
| `/api/articles` | `limit` | optional, integer, min 1 | Default `20` |
| `/api/articles` | `offset` | optional, integer, min 0 | Default `0` |
| `/api/articles/feed` | `limit` | optional, integer, min 1 | Default `20` |
| `/api/articles/feed` | `offset` | optional, integer, min 0 | Default `0` |

## Response Contracts

### User

```json
{
  "user": {
    "email": "jake@example.com",
    "token": "jwt.token.value",
    "username": "jake",
    "bio": "I like APIs",
    "image": "https://example.com/avatar.png"
  }
}
```

### Profile

```json
{
  "profile": {
    "username": "jake",
    "bio": "I like APIs",
    "image": "https://example.com/avatar.png",
    "following": false
  }
}
```

### Single Article

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-05-06T00:00:00.000Z",
    "updatedAt": "2026-05-06T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jake",
      "bio": "I like APIs",
      "image": "https://example.com/avatar.png",
      "following": false
    }
  }
}
```

### Multiple Articles

Article list and feed responses return summaries. They do not include `body`.

```json
{
  "articles": [
    {
      "slug": "how-to-train-your-dragon",
      "title": "How to train your dragon",
      "description": "Ever wonder how?",
      "tagList": ["dragons", "training"],
      "createdAt": "2026-05-06T00:00:00.000Z",
      "updatedAt": "2026-05-06T00:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "author": {
        "username": "jake",
        "bio": "I like APIs",
        "image": "https://example.com/avatar.png",
        "following": false
      }
    }
  ],
  "articlesCount": 1
}
```

### Single Comment

```json
{
  "comment": {
    "id": 1,
    "createdAt": "2026-05-06T00:00:00.000Z",
    "updatedAt": "2026-05-06T00:00:00.000Z",
    "body": "Nice article",
    "author": {
      "username": "jake",
      "bio": "I like APIs",
      "image": "https://example.com/avatar.png",
      "following": false
    }
  }
}
```

### Multiple Comments

```json
{
  "comments": [
    {
      "id": 1,
      "createdAt": "2026-05-06T00:00:00.000Z",
      "updatedAt": "2026-05-06T00:00:00.000Z",
      "body": "Nice article",
      "author": {
        "username": "jake",
        "bio": "I like APIs",
        "image": "https://example.com/avatar.png",
        "following": false
      }
    }
  ]
}
```

### Tags

```json
{
  "tags": ["dragons", "training"]
}
```

### Errors

```json
{
  "errors": {
    "body": ["title is required"]
  }
}
```

## Authorization Rules

| Operation | Rule | Failure |
| --- | --- | --- |
| `GET /api/user` | Current User only | `401` |
| `PUT /api/user` | Current User only | `401` |
| `POST /api/articles` | Authenticated User only | `401` |
| `PUT /api/articles/{slug}` | Authenticated User must be Article author | `403` |
| `DELETE /api/articles/{slug}` | Authenticated User must be Article author | `403` |
| `POST /api/articles/{slug}/comments` | Authenticated User only | `401` |
| `DELETE /api/articles/{slug}/comments/{id}` | Authenticated User must be Comment author | `403` |
| `POST /api/profiles/{username}/follow` | Authenticated User cannot follow self | `401` or `422` |
| `DELETE /api/profiles/{username}/follow` | Authenticated User cannot target self | `401` or `422` |
| `POST /api/articles/{slug}/favorite` | Authenticated User only; duplicate is idempotent | `401` |
| `DELETE /api/articles/{slug}/favorite` | Authenticated User only; missing favorite is idempotent | `401` |
| `GET /api/articles/feed` | Authenticated User only | `401` |

Missing `username`, `slug`, `article`, or `comment` returns `404`.

## Status Code Policy

| Status | Meaning |
| --- | --- |
| `200 OK` | Successful query or update |
| `201 Created` | Successful create command |
| `204 No Content` | Successful delete command with empty response |
| `401 Unauthorized` | Authentication required, malformed JWT, invalid JWT, or expired JWT |
| `403 Forbidden` | Authenticated but not allowed |
| `404 Not Found` | Resource not found |
| `422 Unprocessable Entity` | Validation or domain rule violation |
| `500 Internal Server Error` | Unexpected server error |

## Command / Query Split

### Commands

Commands change state and should wrap write operations in Application-layer transactions.

- Register User
- Login User and issue JWT
- Update User
- Follow / Unfollow
- Create / Update / Delete Article
- Add / Delete Comment
- Favorite / Unfavorite Article

### Queries

Queries read state and may use optimized read models or Eloquent queries in Application / Infrastructure boundaries.

- Get Current User
- Get Profile
- List Articles
- Get Feed
- Get Article
- List Comments
- List Tags

## Backend Issue Breakdown Candidates

1. Identity API: register, login, current user, update user
2. Profile API: profile read, follow, unfollow
3. Article API: create, list, detail, update, delete
4. Comment API: list, create, delete
5. Favorite API: favorite, unfavorite, favorite count state
6. Feed API: followed authors article list
7. Tag API: distinct tag list
8. API error response and Resource formatting
9. Authorization policies for Article and Comment ownership

## Security Notes

- `.env` and secrets are never committed.
- Password is validated on input and stored only as a hash.
- JWT signing secret is separate from `APP_KEY`, supplied through runtime secret management, and never written as a concrete value to `.env`, source files, documentation examples, or logs.
- JWT values are issued only after successful Register or Login and are never hard-coded or logged.
- Invalid or expired supplied JWTs return `401 Unauthorized`, including on Optional endpoints.
- Logout clears the client-held JWT; server-side revocation and refresh tokens are outside this migration scope.
- SQL string concatenation is prohibited; use Eloquent, Query Builder, or Repository implementations.
- Public Profile responses never expose email, password hash, token, or internal IDs.
- All mutating endpoints require authentication unless explicitly listed otherwise.
