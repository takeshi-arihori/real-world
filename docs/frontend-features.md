# Frontend Features

> Issue: #36
> Status: 初版

この文書は React + TypeScript + Vite で RealWorld MVP を実装するための画面、ルーティング、feature 分割、フォーム、エラーハンドリング方針を定義する。

## Current State

- `frontend/` は Vite starter から開始している。
- React Router はまだ依存関係に含まれていない。
- 実装 Issue では React Router 導入、starter 画面の置き換え、`app/`, `features/`, `shared/`, `lib/` 構成への移行を行う。

## Route Plan

| Screen | Path | Auth | Primary feature | Purpose |
| --- | --- | --- | --- | --- |
| Home | `/` | Optional | `article`, `feed`, `tag` | Global Feed / Your Feed / Popular Tags |
| Login | `/login` | Guest | `auth` | Existing User login |
| Register | `/register` | Guest | `auth` | New User registration |
| Settings | `/settings` | Required | `auth`, `profile` | Current User settings update |
| New Editor | `/editor` | Required | `article`, `tag` | Create Article |
| Edit Editor | `/editor/:slug` | Required | `article`, `tag` | Update own Article |
| Article Detail | `/article/:slug` | Optional | `article`, `comment`, `favorite` | Article body, comments, favorite |
| Profile | `/profile/:username` | Optional | `profile`, `article`, `follow` | Author profile and authored Articles |
| Profile Favorites | `/profile/:username/favorites` | Optional | `profile`, `article`, `favorite` | Articles favorited by Profile User |

Auth meanings:

- Guest: redirect authenticated users away from login/register.
- Required: redirect unauthenticated users to `/login` with return path.
- Optional: render for guests, but use token when available to compute `following` and `favorited`.

## App Structure

```text
frontend/src/
├── app/
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── AppProviders.tsx
│   └── routes/
│       ├── router.tsx
│       ├── HomePage.tsx
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── SettingsPage.tsx
│       ├── EditorPage.tsx
│       ├── ArticleDetailPage.tsx
│       └── ProfilePage.tsx
├── features/
│   ├── auth/
│   ├── article/
│   ├── comment/
│   ├── favorite/
│   ├── feed/
│   ├── profile/
│   └── tag/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
└── lib/
    ├── apiClient.ts
    ├── authToken.ts
    └── apiError.ts
```

Pages in `app/routes/` compose feature components only. They do not own API calls, validation schemas, or domain-specific state.

## Feature Responsibilities

| Feature | Responsibility | Owns | Does not own |
| --- | --- | --- | --- |
| `auth` | Login, register, current User, settings update | auth API, auth forms, token lifecycle hooks | Profile following, Article list |
| `article` | Article list, detail, create, update, delete | Article API, editor form, article cards | Favorite mutation internals |
| `comment` | List, create, delete comments | Comment API, comment form/list | Article ownership calculation |
| `profile` | Profile display and profile tabs | Profile API, follow button composition | Auth credential management |
| `favorite` | Favorite / unfavorite actions | Favorite API, favorite button state | Article fetching |
| `feed` | Your Feed and Global Feed switching | Feed API, feed tabs | Article card rendering internals |
| `tag` | Popular tags and tag filtering | Tag API, tag selector/list | Article list pagination |

Each feature exposes only a small barrel API from `features/<feature>/index.ts`.
Cross-feature imports must go through those public exports, and direct imports into another feature's internal directories are prohibited.

## Screen Composition

### Home

Primary workflow:

- Show Global Feed for guests and authenticated users.
- Show Your Feed tab only when authenticated.
- Show selected tag tab when a tag filter is active.
- Show Popular Tags side area.
- Paginate articles with `limit` and `offset`.

Components:

| Component | Owner | Responsibility |
| --- | --- | --- |
| `HomePage` | `app/routes` | Layout and tab composition |
| `ArticleList` | `article` | Article summary list and pagination |
| `FeedTabs` | `feed` | Global / Your Feed / Tag tab state |
| `PopularTags` | `tag` | Tag list and tag filter selection |

### Login / Register

Primary workflow:

- Validate input for immediate UI feedback.
- Submit to Auth API.
- Persist token through `lib/authToken`.
- Refresh current User state.
- Redirect to return path or Home.

Components:

| Component | Owner | Responsibility |
| --- | --- | --- |
| `LoginPage` / `RegisterPage` | `app/routes` | Route layout |
| `LoginForm` / `RegisterForm` | `auth` | Form state, submit state, field errors |
| `FormErrorList` | `shared` | RealWorld errors display |

### Settings

Primary workflow:

- Load current User.
- Update email, username, password, bio, image.
- Reflect validation errors.
- Logout clears token and redirects Home.

### Editor

Primary workflow:

- `/editor` creates a new Article.
- `/editor/:slug` loads and updates an existing Article.
- After success, navigate to `/article/:slug`.
- If the current User is not the Author, show a forbidden state and prevent update.

### Article Detail

Primary workflow:

- Load Article by slug.
- Show full body, tagList, author profile summary, favorite button.
- Show comments for guests and authenticated users.
- Show comment form only when authenticated.
- Allow Comment deletion only for the Comment author.
- Allow Article edit/delete only for the Article author.

### Profile / Profile Favorites

Primary workflow:

- Load Profile by username.
- Show follow button when viewing another User and authenticated.
- Show authored Articles on `/profile/:username`.
- Show favorited Articles on `/profile/:username/favorites`.

## Form Requirements

| Form | Fields | Success | Main errors |
| --- | --- | --- | --- |
| Login | email, password | token saved, redirect | invalid credentials, validation |
| Register | username, email, password | token saved, redirect | duplicate username/email, validation |
| Settings | image, username, bio, email, password | current User updated | duplicate username/email, validation |
| Article Editor | title, description, body, tagList | navigate to Article Detail | validation, forbidden on edit |
| Comment | body | append or refetch comments | unauthenticated, validation |

Frontend validation is for UI feedback only. Backend FormRequest validation remains the source of truth.

Form behavior:

- Disable submit button while submitting.
- Prevent double submit.
- Show field-level errors below fields.
- Show API-level RealWorld `errors.body` messages above the form.
- Preserve user input after validation failure.

## Error Handling

| Error | Handling |
| --- | --- |
| `401 Unauthorized` | Clear invalid token and redirect to `/login` for required routes |
| `403 Forbidden` | Show permission error state and hide forbidden commands |
| `404 Not Found` | Render not found page for Article/Profile routes |
| `422 Unprocessable Entity` | Map API validation errors to form/global errors |
| Network failure | Show retryable error state |
| Unexpected error | App-level Error Boundary with generic message |

`lib/apiClient.ts` should normalize API errors into typed errors so feature hooks do not parse raw `Response` objects.

## State Management

| State | Owner | Approach |
| --- | --- | --- |
| Auth token | `lib/authToken` | storage abstraction |
| Current User | `app/providers/AuthProvider` | context + refresh action |
| Form input | feature form component | local state or form hook |
| Server data | feature hooks | query hooks; cache library can be introduced in a dedicated implementation Issue |
| UI toggles | local component | local state |

Server state must not be copied into broad global UI state.

## API Layer

Feature API functions live under `features/<feature>/api/`.
They convert RealWorld API response fields into frontend camelCase types where appropriate.

Example responsibilities:

- `features/auth/api/login.ts`
- `features/article/api/listArticles.ts`
- `features/comment/api/createComment.ts`
- `features/profile/api/getProfile.ts`
- `features/favorite/api/favoriteArticle.ts`
- `features/feed/api/getFeed.ts`
- `features/tag/api/getTags.ts`

Shared HTTP concerns live in `lib/`:

- base URL
- auth header injection
- response parsing
- API error normalization
- token persistence

## Test Strategy

Frontend tests should use Vitest + Testing Library and assert user-visible behavior.

Initial implementation Issue candidates:

1. App shell and React Router setup
2. API client and error normalization
3. Auth provider and auth forms
4. Article list/detail/editor flows
5. Comment list/create/delete flows
6. Profile/follow/favorites flows
7. Feed and tag filtering flows
8. Route guards and error pages

Test examples:

- Login form disables submit while pending and shows validation errors.
- Required route redirects guest users to Login.
- Home renders Global Feed and Popular Tags.
- Article Detail hides comment form for guests.
- Editor prevents non-author update UI.
- 422 API errors are shown without clearing input.

## Security Notes

- Do not store secrets or API keys in frontend source.
- Do not use `innerHTML` or `dangerouslySetInnerHTML` for Article body in MVP.
- Token storage and auth header injection are centralized in `lib/`.
- Backend authorization remains required even when frontend hides buttons.
