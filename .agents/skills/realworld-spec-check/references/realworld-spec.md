# RealWorld / Conduit Spec Reference

Use this as a compact local checklist for the feature currently being changed or reviewed. Do not treat this file as a mandate to audit every missing RealWorld feature unless the user explicitly asks for a full implementation inventory. When exact wording or the latest contract matters, verify against the official docs:

- Introduction: https://docs.realworld.show/introduction/
- Features: https://docs.realworld.show/implementation-creation/features/
- Expectations: https://docs.realworld.show/implementation-creation/expectations/
- Frontend routing: https://docs.realworld.show/specifications/frontend/routing/
- Frontend API/testing: https://docs.realworld.show/specifications/frontend/api/ and https://docs.realworld.show/specifications/frontend/tests/
- Backend endpoints: https://docs.realworld.show/specifications/backend/endpoints/
- Backend response format: https://docs.realworld.show/specifications/backend/api-response-format/
- Backend errors/CORS/Hurl: https://docs.realworld.show/specifications/backend/error-handling/, https://docs.realworld.show/specifications/backend/cors/, https://docs.realworld.show/specifications/backend/hurl/
- OpenAPI source: https://github.com/realworld-apps/realworld/blob/main/specs/api/openapi.yml
- Frontend selector contract: https://github.com/realworld-apps/realworld/blob/main/specs/e2e/SELECTORS.md

## Product Scope

Overall RealWorld feature areas:

- JWT authentication: login, signup, logout from settings.
- User create/read/update; user deletion is not required.
- Article CRUD.
- Comment create/read/delete; comment update is not required.
- Paginated article lists.
- Favorite/unfavorite articles.
- Follow/unfollow users.

Implementation quality should be MVP-like: functionally complete and stable, but not unnecessarily over-engineered. At least one unit test is expected, while stronger coverage is preferred.

## Backend Contract

Authentication header:

- Use `Authorization: Token <jwt>`.
- Distinguish authentication-required endpoints from authentication-optional endpoints.
- Return 401 when authentication is required and missing/invalid.
- Return 403 when the user is authenticated but not allowed.
- Return 404 when the target resource is not found.
- Return 422 for validation failures with an `errors` object.

Common response rules:

- Return JSON with a correct JSON content type.
- Use RealWorld envelopes: `user`, `profile`, `article`, `articles`, `comment`, `comments`, `tags`, and `articlesCount`.
- API field names are camelCase where the spec uses them: `tagList`, `createdAt`, `updatedAt`, `favoritesCount`.
- Do not expose internal-only fields such as numeric user IDs, password hashes, deleted timestamps, or framework token records.
- User responses include `email`, `token`, `username`, `bio`, `image`.
- Profile responses include `username`, `bio`, `image`, `following`.
- Article responses include `slug`, `title`, `description`, `body` for single article responses, `tagList`, timestamps, `favorited`, `favoritesCount`, and embedded author profile.
- Article list responses include `articles` and `articlesCount`; list endpoints should not include `body` in article items.
- Comment responses include `id`, timestamps, `body`, and embedded author profile.

Endpoint matrix:

| Method | Path | Auth | Request | Response / behavior |
|---|---|---:|---|---|
| POST | `/api/users/login` | No | `user.email`, `user.password` | `user` |
| POST | `/api/users` | No | `user.email`, `user.username`, `user.password` | `user` |
| GET | `/api/user` | Yes | none | current `user` |
| PUT | `/api/user` | Yes | optional `email`, `username`, `password`, `image`, `bio` | updated `user` |
| GET | `/api/profiles/:username` | Optional | none | `profile` |
| POST | `/api/profiles/:username/follow` | Yes | none | followed `profile` |
| DELETE | `/api/profiles/:username/follow` | Yes | none | unfollowed `profile` |
| GET | `/api/articles` | Optional | `tag`, `author`, `favorited`, `limit`, `offset` | recent `articles` |
| GET | `/api/articles/feed` | Yes | `limit`, `offset` | followed authors' recent `articles` |
| GET | `/api/articles/:slug` | No | none | `article` |
| POST | `/api/articles` | Yes | required `title`, `description`, `body`; optional `tagList` | created `article` |
| PUT | `/api/articles/:slug` | Yes | optional `title`, `description`, `body` | updated `article`; title changes update slug |
| DELETE | `/api/articles/:slug` | Yes | none | delete article; author-only |
| POST | `/api/articles/:slug/comments` | Yes | required `comment.body` | created `comment` |
| GET | `/api/articles/:slug/comments` | Optional | none | `comments` |
| DELETE | `/api/articles/:slug/comments/:id` | Yes | none | delete comment; author-only |
| POST | `/api/articles/:slug/favorite` | Yes | none | favorited `article` |
| DELETE | `/api/articles/:slug/favorite` | Yes | none | unfavorited `article` |
| GET | `/api/tags` | No | none | `tags` |

Behavior checks:

- `GET /api/articles` defaults to most recent first, `limit=20`, `offset=0`.
- `tag`, `author`, and `favorited` filters match the spec and can combine safely only where intended by implementation.
- `GET /api/articles/feed` returns articles written by followed users and is ordered most recent first.
- Article title update updates the slug and preserves uniqueness.
- Favorite/unfavorite and follow/unfollow are safe under duplicate/repeated requests if the implementation chooses idempotent behavior.
- `favorited` and `following` are computed from the current authenticated user when present; unauthenticated requests should return false.
- `favoritesCount` is computed from current favorites.
- Delete/update article requires article author. Delete comment requires comment author.
- Validation errors use the envelope shape `{ "errors": { "<field>": ["message"] } }`.
- If frontend and backend use different origins, CORS handles `OPTIONS`, `Access-Control-Allow-Origin`, and needed headers such as `Content-Type` and `Authorization`.

## Frontend Contract

Routes:

- `/`: home page with tags, article list from feed/global/tag, and pagination.
- `/login` and `/register`: auth pages using JWT; token is stored in localStorage unless the project deliberately documents a session/cookie variant.
- `/settings`: update user settings and expose logout.
- `/editor` and `/editor/:slug`: create/edit article.
- `/article/:slug`: article page with markdown rendered client-side, comments, author-only delete article, comment author-only delete comment.
- `/profile/:username` and `/profile/:username/favorites`: profile info, authored articles, favorited articles.

Frontend API behavior:

- Point requests at the configured RealWorld-compatible API base.
- Preserve the RealWorld request body envelopes: `user`, `article`, `comment`.
- Render server validation errors in the expected error list area.
- Hide or disable author-only controls for non-owners; do not rely on UI-only enforcement.
- Keep logged-in/logged-out navigation and feed tabs consistent with auth state.

E2E selector contract:

- The official Playwright suite depends on the selector contract, including form input `name` attributes, required CSS classes, required button/link text, routes, debug interface, localStorage token key, and default avatar behavior.
- When changing UI markup, verify it still satisfies the selectors contract or document an intentional divergence.

## Database / Internal Model Checks

- Internal schema does not need to mirror API shapes exactly, but it must support the contract without leaking internals.
- Numeric internal IDs are acceptable if API uses slugs/usernames/comment IDs as specified and internal user IDs are not exposed.
- Required domain concepts: users, profiles/user public fields, articles with author and slug, comments with author and article, tags, article-tag relation, follows, favorites.
- Enforce uniqueness needed by the API: username, email, article slug, tag name, article-tag pair, follower/followee pair, user/article favorite pair.
- Model deletes according to project rules, but ensure API behavior for deleted resources is 404/forbidden as appropriate.

## Test Expectations For Partial PR Checks

Apply these expectations only to the changed or requested feature area. Do not require tests for unrelated RealWorld features in a partial review.

Backend changes should usually include Feature tests covering:

- Exact endpoint path/method and JSON envelope.
- Required vs optional auth.
- Validation failures with 422 error envelope.
- Authorization failures for non-owner update/delete.
- Pagination/filter/order behavior for list endpoints.
- `favorited`, `following`, and `favoritesCount` from current-user perspective.

Frontend changes should usually include tests covering:

- User-visible flows and routes rather than implementation details.
- Authenticated and unauthenticated states.
- API request body/response mapping.
- Validation/error rendering.
- Owner-only controls.
- Selector contract risk when changing markup, names, classes, or link/button text.
