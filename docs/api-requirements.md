# RealWorld API Requirements

> Issue: #35
> Updated by: #124
> Status: JWT 認証移行方針反映

この文書は Laravel API サーバで RealWorld 互換 API を実装するための API 一覧、認証要否、認可、レスポンス形式、Command / Query 分離方針を定義する。

References:

- https://docs.realworld.show/specifications/backend/endpoints/
- https://docs.realworld.show/specifications/backend/api-response-format/

## Baseline Decisions

- Public API Backend は Laravel 13 + JSON Web Token (JWT) を使って API request を認証する。
- Public API の外部契約は RealWorld 互換を優先し、認証ヘッダーは `Authorization: Token <token>` として扱う。
- Public API は JWT を `user.token` に格納する不透明な token 値として返し、external client は claim に依存しない。
- First-party React frontend は frontend と同一 origin の Backend For Frontend (BFF) のみを呼び、Public API を browser から直接呼ばない。
- BFF は JWT を server-side BrowserSession に関連付け、browser へ JWT を渡さず、保存も送信もさせない。
- Public API の request body と response wrapper は RealWorld 形式に合わせる。BFF endpoint は JWT を露出しない browser 専用 response を定義する。
- 入力検証はすべて FormRequest で行う。
- 認可は Policy / Gate、または FormRequest の `authorize()` から呼び出す。
- Controller は薄く保ち、Application 層の Command / Query に委譲する。
- Domain 層は Laravel、HTTP、Eloquent、JWT の発行・検証実装に依存しない。

## Public API Authentication Semantics

以下の認証区分は Public API の JWT header contract に対して適用する。BFF は BrowserSession を検証した後、認証済み browser request に対応する Public API request へ JWT header を付与する。

| 認証区分 | Public API での意味 | 未認証時 |
| --- | --- | --- |
| Required | 有効な JWT header が必須 | `401 Unauthorized` |
| Optional | JWT header があれば現在 User 視点の `following` / `favorited` を計算する | header がなければゲストとして扱い、状態値は `false` |
| None | JWT header を使わない | 認証状態に依存しない |

認証済み User の識別子は Application 層へ DTO として渡す。
Domain Entity に HTTP token や JWT payload を渡さない。

Public Optional endpoint は header がない場合のみゲストとして扱う。
JWT header が送信されたにもかかわらず署名検証に失敗した場合、形式が不正な場合、または期限切れの場合は、ゲストに降格せず `401 Unauthorized` を返す。BFF がこの `401` を受け取った場合は対応する BrowserSession を失効させ、browser に再 login を要求する。

## Public JWT API Policy

Public API の JWT は Backend の認証実装であり、RealWorld API contract の `Token` scheme や response wrapper を変更しない。

| Item | Decision |
| --- | --- |
| External header contract | `Authorization: Token <jwt>` を維持する。`Bearer` scheme へ変更しない |
| User response contract | Register、Login、Current User、Update User の `user.token` に JWT 文字列を返す |
| Signing algorithm | 単一 Backend が発行・検証する初期構成では `HS256` を使用し、検証時に受理する algorithm を固定する |
| Signing secret | `APP_KEY` とは別の十分にランダムな secret を runtime secret management から注入し、Laravel の `config/*` 経由で参照する。実値を `.env`、git 管理ファイル、ログへ記録しない |
| Required claims | `sub` (User identifier)、`iat` (issued at)、`exp` (expiry) を必須とする |
| TTL | 発行時点から `60` 分 |
| Token issuance | Public Register と Public Login の成功時に新しい JWT を発行する |
| Authenticated user response | Public Current User と Public Update User は request で受理した JWT を返し、暗黙に再発行または有効期限延長をしない |
| Invalid token | 署名不正、形式不正、または期限切れの JWT は `401 Unauthorized` とする |

### Public Token Lifecycle

- Public API は logout endpoint を追加しない。external client が保持する JWT を破棄することで使用を終了する。
- Public API の stateless JWT に server-side revocation list は今回導入しない。漏洩した JWT は期限まで使用できるため、短い TTL でリスクを限定する。
- Refresh token、refresh endpoint、silent refresh は対象外とする。期限切れ後はユーザーが再度 login する。

## Backend For Frontend / BrowserSession Policy

First-party React frontend は public JWT client として動作させない。frontend と同一 origin で公開する BFF が browser 用 session adapter を担い、browser は JWT ではなく BFF の server-side session を識別する opaque cookie のみを送信する。BFF は server-side に保持した JWT を付けて Public API へ request を転送し、Public response の `user.token` を browser response から除去する。

### Browser-Facing BFF Endpoint Contract

以下の BFF endpoints は first-party UI 専用であり、RealWorld の Public API contract には含めない。`user` object は表示に必要な field を返すが、`token` field を含めない。

| Method | Browser-facing BFF Path | Public API call | Purpose | Browser Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/session/csrf` | none | pre-session と CSRF proof を準備 / 再取得する | `{ "csrfToken": "<opaque-proof>" }` |
| `POST` | `/api/session/register` | `POST /api/users` | User を登録し BrowserSession を開始する | `user` without `token` |
| `POST` | `/api/session/login` | `POST /api/users/login` | credential を検証し BrowserSession を開始する | `user` without `token` |
| `GET` | `/api/session` | `GET /api/user` | session に対応する JWT で current User を復元する | `user` without `token` |
| `PUT` | `/api/session/user` | `PUT /api/user` | Settings から current User を更新する | `user` without `token` |
| `DELETE` | `/api/session` | none | server-side session と保持 JWT を失効し cookie を削除する | `204 No Content` |

Article、Comment、Profile、Favorite、Feed、Tag の browser request は BFF に Public API と同じ resource path で送る。BFF は有効な BrowserSession がある request だけ Public API の `Authorization: Token <jwt>` を付与し、session がない Optional request は JWT header なしで転送する。Browser は Public API origin を直接呼ばない。

### BFF Session Security

| Item | Decision |
| --- | --- |
| Browser credential | BFF が管理する推測困難な opaque session identifier。JWT を cookie または browser response body に含めない |
| Cookie | BFF origin から `__Host-conduit_session`; `Path=/; HttpOnly; Secure; SameSite=Lax` を発行し、`Domain` attribute を設定しない |
| Deployment boundary | Browser は frontend/BFF の同一 origin のみを呼ぶ。Public API が異なる site に配置されても browser credential を cross-site 送信しない |
| Session expiry | BFF session、cookie、保持 JWT は開始から最大 `60` 分で期限切れとし、期限切れ後は再 login を要求する |
| Login / register | 認証成功時に session identifier を再生成して fixation を防止する |
| Logout | BFF が server-side session と保持 JWT を破棄し、browser の session cookie を削除する |
| Frontend storage | JWT、session identifier、refresh token を `localStorage`、`sessionStorage`、React state に保存しない |
| Request transport | Frontend API client は同一 origin の BFF に credentialed request を送り、cookie の読取りや `Authorization` header の生成を行わない |
| CSRF bootstrap | BFF の `GET /api/session/csrf` が login/register 前の pre-session と JS-readable な CSRF proof を提供する |
| CSRF validation | BFF cookie が送信される `POST` / `PUT` / `PATCH` / `DELETE` は login、register、logout を含め `X-CSRF-TOKEN` を検証する。missing / invalid proof は `419 CSRF Token Mismatch` とし、認証 cookie と CSRF proof は分離する |
| CORS | Browser と BFF は同一 origin とし credentialed CORS に依存しない。Public API への authenticated browser CORS access は許可しない |
| API technology | Browser-facing BFF は REST endpoint を基本とし、Hono + TypeScript で実装する。GraphQL 導入は今回の認証移行スコープ外とする |

### Deployment / Docker Topology

Production では frontend static assets と BFF endpoint を同じ public origin で提供し、Public API は BFF からのみ認証付きで呼び出す。

| Boundary | Example | Role |
| --- | --- | --- |
| Browser origin | `https://app.example.com` | React assets と BFF `/api/*` を同一 origin で公開する |
| Public API origin | `https://api.example.net` | RealWorld-compatible JWT API。browser の認証付き direct access を提供しない |
| BFF to Public API | server-to-server | BFF が保持 JWT を `Authorization: Token <jwt>` として送信する |

Docker development environment では Hono + TypeScript BFF service を追加し、browser が利用する frontend origin の `/api/*` を BFF へ到達させる。BFF は private Docker network 上で `backend-nginx` に接続する。`compose.yml`、BFF runtime/container、frontend 側 proxy または gateway、環境変数例の実装変更は BFF 実装 Issue で扱う。

## API Endpoint List

以下は Public API の RealWorld 互換 endpoint 一覧である。Browser は直接呼ばず、first-party BFF が必要な JWT header を付与して呼び出す。BFF の session endpoint は `Browser-Facing BFF Endpoint Contract` に定義する。

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
    "password": "<password>"
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
    "password": "<password>"
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
    "password": "<new-password>",
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
    "token": "<jwt-token>",
    "username": "jake",
    "bio": null,
    "image": null
  }
}
```

Register can return `null` profile fields. Login, Current User, and Update User use the same wrapper and return the current persisted `bio` / `image` values.

BFF が browser へ返す `user` response は同じ表示 field を持つが、`token` field を含めない。

### Profile

```json
{
  "profile": {
    "username": "jake",
    "bio": null,
    "image": null,
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
    "createdAt": "2026-05-01T00:00:00.000Z",
    "updatedAt": "2026-05-01T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jake",
      "bio": null,
      "image": null,
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
      "createdAt": "2026-05-01T00:00:00.000Z",
      "updatedAt": "2026-05-01T00:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "author": {
        "username": "jake",
        "bio": null,
        "image": null,
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
    "createdAt": "2026-05-02T00:00:00.000Z",
    "updatedAt": "2026-05-02T00:00:00.000Z",
    "body": "Nice article",
    "author": {
      "username": "bob",
      "bio": null,
      "image": null,
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
      "createdAt": "2026-05-02T00:00:00.000Z",
      "updatedAt": "2026-05-02T00:00:00.000Z",
      "body": "Nice article",
      "author": {
        "username": "bob",
        "bio": null,
        "image": null,
        "following": false
      }
    }
  ]
}
```

### Tags

```json
{
  "tags": ["dragons", "laravel", "training"]
}
```

### Errors

Authentication errors:

```json
{
  "errors": {
    "body": [
      "Unauthenticated."
    ]
  }
}
```

Validation errors flatten FormRequest field messages into `errors.body`:

```json
{
  "errors": {
    "body": [
      "title is required",
      "body is required"
    ]
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
| `POST /api/profiles/{username}/follow` | Authenticated User cannot follow self | `422` |
| `DELETE /api/profiles/{username}/follow` | Authenticated User cannot target self | `422` |
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
| `419 CSRF Token Mismatch` | BFF browser mutation の CSRF proof が missing / invalid / expired |
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
- JWT values are issued only from Public Register or Public Login and are never hard-coded or logged.
- Invalid or expired supplied JWTs return `401 Unauthorized`, including on Optional endpoints.
- First-party frontend never receives JWT values; it communicates only with a same-origin BFF that uses an `HttpOnly`, `Secure`, `SameSite` browser session cookie without a `Domain` attribute, server-side logout invalidation, and CSRF protection.
- BFF stores the Public JWT server-side and sends it to the Public API only in server-to-server requests. Browser-originated authenticated CORS requests to the Public API are not part of this design.
- Login and Register are CSRF-protected browser mutations after a pre-session CSRF bootstrap.
- Public API token revocation and refresh tokens are outside this migration scope.
- SQL string concatenation is prohibited; use Eloquent, Query Builder, or Repository implementations.
- Public Profile responses never expose email, password hash, token, or internal IDs.
- All mutating endpoints require authentication unless explicitly listed otherwise.
