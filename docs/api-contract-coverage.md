# Backend API Contract Coverage

> Issue: #79
> 作成日: 2026-06-04
> 対象: Public RealWorld API

この文書は `docs/api-requirements.md` の MVP endpoint list に対する backend Feature test coverage の確認表である。
API 仕様そのものは `docs/api-requirements.md` を正本とし、この文書は response wrapper、status code、認証・認可、validation のテスト状況を追跡する。

## Coverage Status

| Endpoint | Auth | Response wrapper | Status / negative coverage | Test file | Status |
| --- | --- | --- | --- | --- | --- |
| `POST /api/users` | None | `user` | `201`, duplicate `422`, validation `422` | `backend/tests/Feature/Identity/RegisterUserApiTest.php` | Covered |
| `POST /api/users/login` | None | `user` | `200`, invalid credentials `422`, validation `422` | `backend/tests/Feature/Identity/LoginUserApiTest.php` | Covered |
| `GET /api/user` | Required | `user` | `200`, missing / malformed / invalid / expired token `401` | `backend/tests/Feature/Identity/CurrentUserApiTest.php` | Covered |
| `PUT /api/user` | Required | `user` | `200`, missing token `401`, duplicate / invalid input `422` | `backend/tests/Feature/Identity/CurrentUserApiTest.php` | Covered |
| `GET /api/profiles/{username}` | Optional | `profile` | `200`, following state, missing profile `404` | `backend/tests/Feature/Social/ProfileFollowApiTest.php` | Covered |
| `POST /api/profiles/{username}/follow` | Required | `profile` | missing token `401`, self-follow `422`, idempotent insert | `backend/tests/Feature/Social/ProfileFollowApiTest.php` | Covered |
| `DELETE /api/profiles/{username}/follow` | Required | `profile` | missing favorite equivalent is idempotent for unfollow state | `backend/tests/Feature/Social/ProfileFollowApiTest.php` | Covered |
| `GET /api/articles` | Optional | `articles`, `articlesCount` | filter / pagination, invalid query `422`, invalid optional token `401`, no `body` in list item | `backend/tests/Feature/Publishing/ArticleCrudApiTest.php` | Covered |
| `POST /api/articles` | Required | `article` | `201`, missing token `401`, validation `422` | `backend/tests/Feature/Publishing/ArticleCrudApiTest.php` | Covered |
| `GET /api/articles/{slug}` | Optional | `article` | `200`, favorited / following state, missing article `404`, invalid optional token `401` | `backend/tests/Feature/Publishing/ArticleCrudApiTest.php` | Covered |
| `PUT /api/articles/{slug}` | Required | `article` | missing token `401`, non-author `403`, missing article `404`, update wrapper | `backend/tests/Feature/Publishing/ArticleCrudApiTest.php` | Covered |
| `DELETE /api/articles/{slug}` | Required | empty | missing token `401`, non-author `403`, missing article `404`, success `204` | `backend/tests/Feature/Publishing/ArticleCrudApiTest.php` | Covered |
| `POST /api/articles/{slug}/favorite` | Required | `article` | missing token `401`, missing article `404`, duplicate favorite idempotency | `backend/tests/Feature/Publishing/ArticleFavoriteApiTest.php` | Covered |
| `DELETE /api/articles/{slug}/favorite` | Required | `article` | missing favorite idempotency | `backend/tests/Feature/Publishing/ArticleFavoriteApiTest.php` | Covered |
| `GET /api/articles/{slug}/comments` | Optional | `comments` | `200`, author following state, invalid optional token `401`, missing article `404` | `backend/tests/Feature/Publishing/CommentApiTest.php` | Covered |
| `POST /api/articles/{slug}/comments` | Required | `comment` | `201`, missing token `401`, validation `422`, missing article `404` | `backend/tests/Feature/Publishing/CommentApiTest.php` | Covered |
| `DELETE /api/articles/{slug}/comments/{id}` | Required | empty | success `204`, non-author `403`, missing / cross-article comment `404` | `backend/tests/Feature/Publishing/CommentApiTest.php` | Covered |
| `GET /api/articles/feed` | Required | `articles`, `articlesCount` | Not implemented yet | none | Gap |
| `GET /api/tags` | None | `tags` | `200`, distinct sorted tags, empty list, seeded tags fixture | `backend/tests/Feature/Publishing/TagApiTest.php` | Covered |

## Remaining Gaps

- Feed API の required auth `401`、followee article list、pagination contract は未実装 endpoint のため未対応。
- Follow の duplicate follow は `insertOrIgnore` による idempotent insert として扱うが、重複 follow 専用の独立テストは未追加。

## Review Notes

- Error wrapper 共通仕様は `backend/tests/Feature/RealWorldApiErrorResponseTest.php` で `errors.body`、`401` / `403` / `404` / `422` / `500` を横断確認している。
- Public API JWT は `Authorization: Token <token>` を維持し、invalid optional token は guest に降格せず `401` にする。
- `.env`、JWT signing secret、実 token 値はこの checklist に記載しない。
