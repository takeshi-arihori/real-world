# Blog Service Issue Breakdown

> Issue: #38
> Status: 初版

この文書は Blog Service MVP の要件定義を、後続の設計・実装 Issue に分解するための計画である。
親 Issue #2 を閉じる前に、要件、DDD、API、Frontend、非機能要件の成果物が揃っていることを確認する。

## Reviewed Inputs

| Area | Artifact | Source Issue | Status |
| --- | --- | --- | --- |
| Requirements | `docs/requirements.md` | #2 / #32 | merged |
| Context Map | `docs/context-map.md` | #33 | PR #41 |
| Ubiquitous Language | `docs/ubiquitous-language.md` | #34 | PR #42 |
| API Requirements | `docs/api-requirements.md` | #35 | PR #43 |
| Frontend Features | `docs/frontend-features.md` | #36 | PR #44 |
| Non-Functional Requirements | `docs/non-functional-requirements.md` | #37 | PR #45 |
| Rules | `docs/rules/*` | existing | merged |

The implementation phase can start after #33-#38 are merged into `develop`.

## Implementation Order

1. Backend and Frontend foundation
2. Identity Context
3. Publishing Context read model baseline
4. Publishing Context write operations
5. Social Context
6. API and Frontend integration per workflow
7. E2E, QA, and polish

This order avoids building UI workflows before API contracts and authentication state are stable.

## Implementation Roadmap

> Updated: 2026-08-13

2026-08-13 時点で計画した実装・品質改善 Issue は、単一レーンで作業する場合は次の順序を正とする。
複数レーンで進める場合も、`Depends on` を満たすまでは後続 Issue をマージしない。
完了した Issue の行は実装順の意思決定記録として残し、進捗状態はGitHub Issue / Projectを正とする。

| Order | Issue | Direct prerequisites | Parallelization note |
| ---: | --- | --- | --- |
| 1 | #199 BFF依存関係のHigh脆弱性を解消する | None | #200、#207 と並行可能 |
| 2 | #200 Backend依存関係のHigh脆弱性を解消する | None | #199、#207 と並行可能 |
| 3 | #207 API性能要件と負荷試験方針を定義する | None | #199、#200 と並行可能 |
| 4 | #203 ArticleとCommentを論理削除へ移行する | None | #201 と並行可能。#211、#210 より先に完了する |
| 5 | #201 Frontendのfeature境界とPage責務を整理する | None | #203 と並行可能。#202、#204、#213 より先に完了する |
| 6 | #211 大規模データセットで性能試験できるSeederを作成する | #203 | #202 と並行可能 |
| 7 | #202 記事本文を安全なMarkdownとして表示する | #201 | #211 と並行可能 |
| 8 | #208 k6でAPI負荷試験のベースラインを作成する | #199、#200、#207、#211 | Frontend品質改善とは並行可能 |
| 9 | #209 APIレイテンシーのボトルネックを計測可能にする | #208 | #204、#213 と並行可能 |
| 10 | #210 Article / Feed APIのDB性能を検証・改善する | #203、#208、#209 | Rate Limit導入前の同一条件でDB性能を評価する |
| 11 | #212 APIのRate Limit / Timeout等の耐障害性を整備する | #208、#209、#210 | #210 の計測を保護機構で遮らないよう後に実施する |
| 12 | #204 Frontendのbranch coverageを80%以上へ引き上げる | #201、#202 | #209〜#212 と並行可能 |
| 13 | #213 Frontend Web Performance Budgetを定義・計測する | #201、#202、#207 | Backend性能改善と独立して計測し、API latencyとFrontend処理を分離する |

運用ルール:

- runtime dependency の High / Critical finding を扱う #199、#200 を、性能ベースライン取得前に完了する。
- #203 を #211 より先に完了し、performance dataset が論理削除方針とDB制約に従うようにする。
- #201 を #202、#204、#213 より先に完了し、Frontend構造を安定させてから表示、coverage、性能を評価する。
- 性能改善は #207（要件）→ #211（データ）→ #208（負荷試験）→ #209（観測性）→ #210（DB改善）→ #212（耐障害性）の順に進める。
- Issue の直接依存は各 Issue 本文の `Depends on` にも記載し、Epic 内の親子関係はGitHub native sub-issueを正とする。
- Issue が完了してもこの表から削除せず、順序変更または後続 Issue の追加があった場合に表を更新する。
- 実装順を変更する場合は、この節と対象 Issue の `Depends on` を同じ変更単位で更新する。

## Epic Candidates

| Epic | Goal | Depends on | Done when |
| --- | --- | --- | --- |
| Backend Foundation | Laravel Public API の DDD 構成、共通 error response、JWT 認証基盤を用意する | #35, #37, #124 | Public API 実装 Issue が共通構造に乗る |
| Frontend Foundation | React Router、BFF client、Auth Provider、App Shell を用意する | #36, #37, #124 | 画面実装 Issue が共通構造に乗る |
| Browser BFF | Hono + TypeScript の same-origin BFF、BrowserSession、CSRF、Public API forwarding、Docker 経路を用意する | #124, Backend Foundation | frontend が JWT を受け取らず Public API 機能を利用できる |
| Identity Context | Register / Login / Current User / Settings API と画面を実装する | Backend/Foundation, Frontend/Foundation | 認証状態を使う後続機能が実装可能 |
| Publishing Context | Article / Comment / Tag の API と画面を実装する | Identity | 記事作成から詳細閲覧、コメントまで動く |
| Social Context | Profile / Follow / Favorite / Feed を実装する | Identity, Publishing | Blog Service の social workflow が動く |
| API Integration | Backend API と Frontend feature API を結合する | 各 Context | 主要画面が実 API で動く |
| E2E / Quality | 代表ユーザーフロー、CI、audit、レビュー観点を強化する | 全 Epic | MVP の回帰検出ができる |

## Backend Issue Candidates

| Order | Candidate Issue | Labels | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | chore: Backend DDD ディレクトリとDI基盤を整備する | `type: chore`, `area: backend`, `area: ddd` | `Domain/`, `Application/`, `Infrastructure/`, `Presentation/` skeleton | Layer boundaries and provider bindings documented/tested |
| 2 | feat: RealWorld API error response を実装する | `type: feature`, `area: backend`, `area: api` | error wrapper, exception mapping, status code policy | 401/403/404/422 tests pass |
| 3 | feat: Public API のJWT発行・検証を実装する | `type: feature`, `area: backend`, `area: auth` | `POST /api/users`, `POST /api/users/login`, authenticated Public API | validation, duplicate, JWT response/auth tests pass |
| 4 | feat: 現在ユーザー取得・更新APIを実装する | `type: feature`, `area: backend`, `area: auth` | `GET /api/user`, `PUT /api/user` | auth required, update validation, unique exception tests pass |
| 5 | feat: Profile取得・Follow APIを実装する | `type: feature`, `area: backend`, `area: profile`, `area: social` | profile read, follow, unfollow | optional auth and self-follow rejection tests pass |
| 6 | feat: Article CRUD APIを実装する | `type: feature`, `area: backend`, `area: article` | create, list, detail, update, delete | slug, pagination, filters, author-only policy tests pass |
| 7 | feat: Comment APIを実装する | `type: feature`, `area: backend`, `area: comment` | list, create, delete | guest list, auth create, author-only delete tests pass |
| 8 | feat: Favorite APIを実装する | `type: feature`, `area: backend`, `area: social`, `area: article` | favorite, unfavorite, count | idempotency and count tests pass |
| 9 | feat: Feed and Tag APIを実装する | `type: feature`, `area: backend`, `area: api` | `/api/articles/feed`, `/api/tags` | auth feed and distinct tag list tests pass |
| 10 | test: Backend API contract coverageを補強する | `type: test`, `area: backend`, `area: api` | response wrapper, status code, policy gaps | MVP API contract checklist covered |

## Frontend Issue Candidates

| Order | Candidate Issue | Labels | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | chore: React Router と App Shell を導入する | `type: chore`, `area: frontend` | routing, layout, route guards baseline | starter UI removed, routes render |
| 2 | feat: API client と error normalization を実装する | `type: feature`, `area: frontend`, `area: api` | `lib/apiClient`, typed errors, same-origin BFF requests, CSRF proof | 401/422/CSRF mapping tests pass |
| 3 | feat: Auth Provider と認証フォームを実装する | `type: feature`, `area: frontend`, `area: auth` | login, register, current user, logout | browser session lifecycle and form error tests pass |
| 4 | feat: Settings画面を実装する | `type: feature`, `area: frontend`, `area: auth`, `area: profile` | current user settings update | submit, validation, logout tests pass |
| 5 | feat: Home / Feed / Tag filtering を実装する | `type: feature`, `area: frontend`, `area: article` | global feed, your feed, tags, pagination | guest/auth tab behavior tests pass |
| 6 | feat: Article Detail と Favorite UI を実装する | `type: feature`, `area: frontend`, `area: article`, `area: social` | detail, favorite, author actions | optional auth and button state tests pass |
| 7 | feat: Article Editor を実装する | `type: feature`, `area: frontend`, `area: article` | create/edit form | validation, submit, redirect tests pass |
| 8 | feat: Comment UI を実装する | `type: feature`, `area: frontend`, `area: comment` | comment list, create, delete | guest read and author delete tests pass |
| 9 | feat: Profile / Favorites / Follow UI を実装する | `type: feature`, `area: frontend`, `area: profile`, `area: social` | profile pages, follow button, favorited articles | follow state and tabs tests pass |
| 10 | test: Frontend workflow coverageを補強する | `type: test`, `area: frontend` | integration-style component tests | auth/article/profile critical paths covered |

## Infra / QA Issue Candidates

| Order | Candidate Issue | Labels | Scope | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | chore: READMEとローカルセットアップを実装状態へ追従する | `type: docs`, `area: infra`, `area: non-functional` | README commands, ports, troubleshooting | first-run steps are copy-pasteable |
| 2 | ci: Frontend / Backend / Secrets Scan のCIをMVP実装へ合わせる | `type: chore`, `area: infra` | GitHub Actions checks | required checks match rules |
| 3 | test: Blog Service MVP のE2Eスモークを追加する | `type: test`, `area: frontend`, `area: backend` | register/login/article/comment/favorite flow | representative happy path covered |
| 4 | chore: dependency audit の運用を整理する | `type: chore`, `area: non-functional` | composer audit, pnpm audit | audit command and triage policy documented |
| 5 | docs: API contract examplesを実装後レスポンスで更新する | `type: docs`, `area: api` | examples in docs | docs match real response tests |

## Authentication Migration Order

| Order | Issue | Scope | Merge condition |
| --- | --- | --- | --- |
| 1 | #124 | Public JWT API、BFF、BrowserSession、CSRF、Docker topology の設計方針 | 後続実装の前提として先にマージ |
| 2-a | #126 | Laravel Public API の JWT 発行・検証 | #124 後。#131 と並行可能 |
| 2-b | #131 | Hono + TypeScript の same-origin BFF、BrowserSession、CSRF、Public API forwarding、Docker service/proxy/env example | #124 後。#126 と並行可能 |
| 3 | #125 | Frontend を BFF client へ移行し browser-readable token handling を削除 | #131 の browser-facing API が利用可能になってからマージ |
| 4 | #127 | Public JWT と BFF BrowserSession の統合 QA | #125、#126、#131 の完了後 |

Browser-facing BFF は Hono + TypeScript による REST proxy / 必要最小限の aggregation endpoint を基本とする。GraphQL 導入は認証移行の対象外とし、必要性が生じた場合に独立した設計 Issue として扱う。

## Suggested Milestones

| Milestone | Contents | Exit Criteria |
| --- | --- | --- |
| MVP Foundation | Backend Foundation, Frontend Foundation | Shared skeleton, API client, auth guard ready |
| MVP Identity | Identity Context backend + frontend | User can register, login, update settings |
| MVP Publishing | Article, Comment, Tag backend + frontend | Article CRUD and comments work |
| MVP Social | Profile, Follow, Favorite, Feed backend + frontend | Social workflows work |
| MVP Hardening | E2E, audits, docs, review fixes | Main checks pass and MVP is demoable |

## Parent Issue #2 Closure Checklist

Parent Issue #2 can be closed when:

- [ ] #33 Context Map is merged
- [ ] #34 Ubiquitous Language is merged
- [ ] #35 API Requirements is merged
- [ ] #36 Frontend Features is merged
- [ ] #37 Non-Functional Requirements is merged
- [ ] #38 Issue Breakdown is merged
- [ ] `docs/requirements.md` links or references the detailed planning artifacts
- [ ] Backend / Frontend implementation Issue candidates are created or accepted as the next backlog

## Labeling Guidance

Use labels from `docs/labels.md`.

- Planning docs: `type: docs`, `type: planning`
- Backend implementation: `type: feature`, `area: backend`, plus domain area
- Frontend implementation: `type: feature`, `area: frontend`, plus feature area
- Tests: `type: test`
- CI / setup: `type: chore`, `area: infra`
- Security-sensitive changes: include the affected `area:*` and call out `docs/rules/security.md` in the PR body

## Security and Review Notes

- Auth, authorization, validation, and error response work should be reviewed before dependent UI work.
- Article update/delete and Comment delete must include negative authorization tests.
- Follow self, duplicate favorite, missing resource, and guest access cases must be tested.
- `.env` changes remain out of scope for all generated Issue candidates.
- API examples must not include real tokens or credentials.
