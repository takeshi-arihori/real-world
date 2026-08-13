# Non-Functional Requirements

> Issue: #37
> Status: 初版

この文書は RealWorld プロジェクトを継続開発するための品質、開発体験、ローカル再現性、検証ゲートを定義する。
詳細なコーディング規約は `docs/rules/*` を正本とし、この文書ではプロジェクト全体の非機能要件を扱う。

## Quality Goals

| Category | Requirement |
| --- | --- |
| Correctness | API 契約、認可、バリデーション、境界値をテストで確認する |
| Maintainability | Backend は DDD 4層、Frontend は `app/`, `features/`, `shared/`, `lib/` の境界を守る |
| Type safety | TypeScript strict と PHPStan で静的に検出できる問題をCI前に潰す |
| Security | `.env`、シークレット、危険な動的実行、SQL文字列結合を禁止する |
| Browser auth boundary | First-party browser は same-origin BFF のみを呼び、Public API JWT を保持または直接送信しない |
| Reproducibility | Docker Compose と lockfile により、ローカルで同じ構成を再現できる |
| Reviewability | Issue、spec、PR、テスト計画を紐付け、レビューで判断しやすくする |

## TypeScript Strict Policy

Frontend は TypeScript strict を前提にする。
実装時は `frontend/tsconfig*.json` の strict 系設定を緩めない。

Required:

- `any` を使わない。外部入力は `unknown` で受け、型ガードや schema で絞り込む。
- 関数の公開境界では戻り値型を明示する。
- API response 型と UI type を分け、`features/*/api/` で変換する。
- null / undefined を明示的に扱う。
- `as` キャストは最小化し、必要な場合は理由をコードコメントで残す。

Forbidden:

- strict 設定を無効化するための `// @ts-ignore` の常用
- `skipLibCheck` などの緩和設定追加を問題回避目的で行うこと
- API response を型変換せずに UI へ広げること

Verification:

```bash
cd frontend && pnpm tsc -b --noEmit
```

## Lint / Format Policy

### Frontend

- ESLint を TypeScript / React の静的解析ゲートとして使う。
- Formatting は ESLint と既存スタイルに従う。
- Prettier は現時点で未導入。導入する場合は別 Issue で設定し、ESLint と責務が衝突しないようにする。

Verification:

```bash
cd frontend && pnpm eslint .
```

### Backend

- Laravel Pint を PHP の formatting gate として使う。
- PHPStan / Larastan を静的解析ゲートとして使う。
- `declare(strict_types=1)`、戻り値型、DDD の依存方向を維持する。

Verification:

```bash
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
```

### Documentation

- Markdown は手動整形と `git diff --check` を最低限のチェックにする。
- 恒久的な判断は `docs/` に残し、`AGENTS.md` や agent 固有ファイルへ詳細を重複させない。

Verification:

```bash
git diff --check
```

## Test Policy

### Frontend Tests

Stack:

- Vitest
- Testing Library
- `@testing-library/jest-dom`
- `@testing-library/user-event`

Focus:

- ユーザー視点の画面挙動
- フォーム入力、送信中状態、バリデーション表示
- route guard と redirect
- API error の表示
- 認証状態に応じた UI の出し分け

Avoid:

- 実装詳細の state や private function への過剰な依存
- API response の手作業モック重複
- Snapshot だけで仕様を確認したことにするテスト

Verification:

```bash
cd frontend && pnpm vitest run
```

### Backend Tests

Stack:

- Pest
- Laravel testing utilities
- PHPStan / Larastan

Focus:

- Feature test: API 契約、HTTP status、response wrapper、認証、認可、バリデーション
- Unit test: Entity / ValueObject / Domain Service の業務ルール
- Repository test: 永続化変換、unique constraint、relationship
- Security test: 未認証、他者操作、存在しない resource

Avoid:

- Controller にビジネスロジックを寄せて Feature test だけで済ませること
- 認可や失敗ケースを正常系の補助としてしか見ないこと
- DB 状態に依存して順序が不安定なテスト

Verification:

```bash
cd backend && php artisan test
```

## Git Hooks Policy

Root package uses Husky and commitlint.

Required:

- Commit message follows Conventional Commits.
- `type` and optional `scope` use English.
- Description is Japanese.
- No `Co-Authored-By:` line.

Recommended local setup:

```bash
npm install
```

Hook responsibilities:

| Hook | Responsibility |
| --- | --- |
| `commit-msg` | Conventional Commits validation |
| `pre-commit` | Optional fast checks only; long tests should stay in CI or manual QA |
| `pre-push` | Optional targeted checks; must not make normal development too slow |

If new hooks are added, document the command, expected runtime, and bypass policy in `docs/rules/git-flow.md`.

## Security Requirements

Always follow `docs/rules/security.md`.

Required:

- Do not edit or commit `.env`.
- Do not hard-code secrets, API keys, tokens, passwords, or private URLs.
- Do not use `eval()`, `exec()`, `shell_exec()`, unchecked `innerHTML`, or unchecked `dangerouslySetInnerHTML`.
- Do not build SQL with string concatenation.
- Use FormRequest for all backend input validation.
- Use Policy / Gate for authorization.
- Keep frontend validation as UI feedback only.
- Keep Public API JWT in the BFF server-side session and never expose it to browser-readable storage or responses.
- Serve browser-facing BFF endpoints from the same origin as frontend assets; do not rely on cross-site authentication cookies.

Audit commands:

```bash
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

## Dependency Audit Operations

Dependency audit は Composer と pnpm 管理の依存ライブラリに対する
セキュリティ確認ゲートとして扱う。依存関係の追加・更新、Dependabot PR、
security-sensitive な変更、MVP hardening / release 前には、対象 manifest と
lockfile に対応する audit を実行する。

### Commands

通常は変更した package manager / manifest に対応する command を実行する。
依存更新や release 前の確認では、現在の backend / frontend / BFF の全対象を
確認する。

```bash
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

Root `package.json` または root `pnpm-lock.yaml` を変更した場合は、repo root で
`pnpm audit` も実行する。

### When To Run

- `composer.json` / `composer.lock` / `package.json` / `pnpm-lock.yaml` を変更した PR。
- 新しい dependency または dev dependency を追加した PR。
- Dependabot など dependency update PR の review 前。
- security-sensitive な認証、認可、BFF、cookie、CSRF、JWT、入力処理の変更。
- MVP hardening、release branch cut、または脆弱性 advisory を受けた臨時確認。

### Triage Policy

audit で finding が出た場合は、PR 本文または review comment に次を記録する。

| Item | 内容 |
| --- | --- |
| severity | audit が示す severity と advisory ID / URL |
| dependency path | affected package が direct dependency か transitive dependency か |
| usage | runtime dependency か dev dependency か、実行経路が backend / frontend / BFF / build-time のどれか |
| exploitability | このアプリの使い方で exploitability があるか。入力到達性、認証要否、browser exposure を確認する |
| remediation | patch / minor / major update、package removal、代替 package、設定変更などの remediation 方針 |
| owner and action | この PR で修正、follow-up Issue 作成、temporary exception のどれで扱うか |

runtime dependency の high / critical finding は原則として merge 前に解消する。
dev dependency の finding でも、build script、test runner、code generation、
CI secret exposure に関係する場合は runtime finding と同じ優先度で扱う。

### New Dependency PR Notes

新しい dependency を追加する PR では、PR 本文の修正ファイル説明または
マージ時の注意点に次を含める。

- 追加した reason と、既存コードまたは標準 API では足りない理由。
- 変更した manifest と lockfile。
- runtime dependency / dev dependency の区分。
- audit command の実行結果。未解消 finding がある場合は triage 結果。
- package が認証、cookie、CSRF、JWT、入力処理、HTML rendering に触れる場合の
  セキュリティ上の確認内容。

`.env`、API key、token、password、private URL などの secret 実値は、audit
結果、PR 本文、Issue、docs、test fixture に含めない。

### Major Update Policy

major update は破壊的変更を伴う前提で扱い、通常の feature / fix と同じ PR に
混ぜない。脆弱性修正で major update が必要な場合は、次を確認してから実施する。

- migration guide と breaking changes。
- 影響する runtime、API contract、BFF proxy、browser behavior、test helper。
- rollback または revert 可能性。
- 関連する type-check、test、lint、static analysis、audit の結果。

major update がすぐに適用できない場合は、temporary exception と follow-up
Issue を作成し、期限と再評価条件を明示する。

### Temporary Exception Policy

temporary exception は、固定版が未提供、または修正が大きな migration を必要とし
即時適用のリスクが高い場合に限る。例外は audit ignore の設定だけで済ませず、
PR または Issue に次を残す。

- advisory ID / URL、affected package、現在の version、dependency path。
- severity とこのアプリでの exploitability 判断。
- すぐに remediation できない reason。
- mitigation、owner、follow-up Issue。
- expiry と re-evaluation date。

runtime dependency の high / critical finding は、明確な mitigation と短い
expiry がない限り temporary exception にしない。期限切れの exception は新規
dependency 追加や release の前に再評価する。

## Performance / Load Testing

API の性能判断は、固定データセットと固定シナリオを使った再現可能な計測を基準にする。
ローカル Docker の絶対値にはホスト差があるため、暫定 Performance Budget への適合と、
同一環境での Before / After の両方を記録する。Frontend の描画、Core Web Vitals、
bundle size は API latency と混同せず、Frontend Performance Budget で別に扱う。

### Metrics

計測値は経路、scenario、endpoint ごとに記録する。複数 endpoint の集計値だけで、
特定 endpoint の劣化を隠してはならない。

| Metric | Definition | 採用理由 |
| --- | --- | --- |
| throughput / RPS | 計測区間中に完了した request 数を秒数で割った実効値。設定した arrival rate とは分けて記録する | 目標負荷を実際に処理できたか、処理能力が低下していないかを確認するため |
| p50 latency | request duration の中央値 | 通常の request で利用者が経験する代表的な応答時間を確認するため |
| p95 latency | request duration の 95 percentile | 大多数の利用者に影響する遅い request を品質ゲートとして捉えるため |
| p99 latency | request duration の 99 percentile | tail latency、lock、slow query、BFF / Redis の一時的な停滞を検出するため |
| error rate | expected status / response check を満たさない response と、timeout、connection error の合計を全 request 数で割った値 | HTTP response が返るだけでは成功とみなさず、契約違反と到達不能を検出するため |
| request count | 計測区間に開始・完了した request 数。未処理の iteration と dropped iteration も併記する | percentile の標本数と、負荷生成側が目標 RPS を維持できたかを確認するため |

latency は load generator から response body の受信完了までを計測する。
load generator の実行位置は比較中に変更せず、client-side の待ち時間を含む
end-to-end 指標として扱う。DB query time や Laravel / BFF 内部の処理時間は
ボトルネック分析の補助指標であり、この latency の代替にはしない。

### Initial Performance Budget

以下は初回ベースライン取得前の暫定値であり、production capacity の保証値ではない。
通常負荷とピーク負荷は、主要 read API を混ぜた system-wide arrival rate とする。
latency と error rate は warm-up を除いた計測区間について、経路別かつ endpoint 別に
評価する。

| Condition | Budget |
| --- | --- |
| 通常負荷 | 100 RPS を 10 分間維持する |
| ピーク負荷 | 300 RPS を3分間維持する |
| p95 latency | 200 ms 未満 |
| p99 latency | 500 ms 未満 |
| error rate | 1% 未満 |
| p50 latency | 必ず記録する。初回ベースラインまでは絶対値 gate を設けない |

設定した arrival rate と実効 throughput の差、request count 不足、dropped iteration は
capacity 不足として扱い、latency が budget 内でも成功とはみなさない。

### Target APIs And Paths

初期ベースラインは read 比率が高く、DB query、pagination、認証、BFF overhead を
比較できる次の API を対象にする。各 endpoint の単独 scenario と、実利用に近い
mixed read scenario の両方を用意する。

| API | Purpose | Authentication |
| --- | --- | --- |
| `GET /api/articles?limit=20&offset=<n>` | Article list、pagination、filter の基本性能 | optional |
| `GET /api/articles/feed?limit=20&offset=<n>` | follow relationship を含む Feed query の性能 | required |
| `GET /api/articles/{slug}` | Article detail、author、favorite metadata の取得性能 | optional |
| `GET /api/tags` | distinct tag aggregation の性能 | none |

write API はデータ量を変化させて比較条件を壊すため、初期の共通 mixed scenario には
含めない。作成・更新・削除を計測するときは read scenario と分離し、実行後に専用DBを
同じ seed から再生成する。

同じ scenario を次の2経路で別々に実行し、結果を混ぜない。

| Path | Reference endpoint | Authentication boundary |
| --- | --- | --- |
| Laravel Public API direct | `http://localhost:8080/api/*` | setup で取得した Public API JWT を `Authorization: Token <jwt>` として送る |
| BFF | `http://localhost:3006/api/*`。browser と同じ経路まで確認する場合は `http://localhost:3005/api/*` も別結果として記録する | setup で BrowserSession と CSRF proof を確立し、cookie 認証を使用する |

Laravel direct と BFF は同じ dataset、request distribution、arrival rate、warm-up、
計測時間で順番に実行する。同時実行で互いに resource contention を起こしてはならない。
BFF overhead は同条件の経路差として評価し、Frontend rendering time を含めない。

### Performance Dataset

負荷試験は通常の development / test fixture と分離した専用DBで行い、production data を
複製または利用しない。大規模 preset の初期値は次とする。

| Data | Initial volume |
| --- | ---: |
| Users | 10,000 |
| Articles | 100,000 |
| Comments | 300,000 |
| Favorites | 500,000 |
| Follows | 100,000 以上 |
| Tags | 1,000 以上の distinct tag と、偏りを持つ article-tag relationship |

同じ seed 値から同じ件数と概ね同じ分布を再生成できることを必須とする。
Article、Comment、Favorite、Follow、Tag の分布は均一にせず、人気記事や多投稿者を含む
偏りを固定する。論理削除を含む場合は active / deleted 件数を分けて記録し、通常 query が
deleted record を返さないことを確認する。

各結果には seed、各 table の実件数、生成時間、DB size を記録する。data volume または
分布が異なる結果は同一 baseline と比較しない。小規模な CI fixture の結果は大規模 preset の
代替にしない。

### Test Profiles

arrival-rate executor を基本とし、実負荷が target RPS を維持できるだけの VU を確保する。
以下の VU は初期値であり、変更した場合は理由と実値を結果へ残す。

| Profile | Warm-up（集計外） | Measurement / load shape | Initial concurrency | Purpose |
| --- | --- | --- | --- | --- |
| Smoke | 10 秒、1 RPS | 30 秒、1 RPS | 1 VU | script、認証 setup、API contract、計測出力の動作確認 |
| Load | 2 分、25 RPS | 10 分、100 RPS | 50 pre-allocated VU、200 max VU | 通常負荷の baseline と budget 判定 |
| Stress | 2 分、50 RPS | 100 / 200 / 300 / 400 RPS を各3分。必要時のみ安全な上限まで追加 | 100 pre-allocated VU、500 max VU | latency / error の悪化点と処理限界の確認 |
| Spike | 2 分、50 RPS | 50 RPS から300 RPSへ30秒で上げ、30秒維持後、50 RPSで2分 recovery | 100 pre-allocated VU、500 max VU | 突発負荷への応答と回復を確認 |
| Soak | 5 分、50 RPS | 60 分、100 RPS | 50 pre-allocated VU、200 max VU | connection、memory、pool、cache の時間経過による劣化を確認 |

Stress は error rate 5% 以上、連続した timeout、またはホストの安全を損なう兆候が出た時点で
停止し、停止点を結果として記録する。Spike と Soak は通常負荷で回復したか、計測開始時と
終了時で p95 / p99、error rate、resource usage が悪化していないかも確認する。

mixed read scenario の初期 request distribution は Article list 40%、Feed 25%、
Article detail 25%、Tags 10% とする。slug、offset、認証ユーザーを固定された候補集合から
seeded selection し、単一 row や単一 cache entry だけを繰り返さない。

### CI And Manual Execution Boundary

| Execution | Scope | Gate |
| --- | --- | --- |
| CI lightweight | 小規模な専用 fixture に対する Smoke。performance script、対象API、query、BFF proxy / session を変更したPRで Laravel direct と BFF を実行する | setup 成功、expected response check 100%、transport error なし、dropped iteration なし、最低 request count を満たすこと。shared runner の絶対 latency は記録のみ |
| Manual reference | 大規模 preset に対する Load。性能影響のあるPR、baseline更新、release前に固定Docker環境で実行する | 暫定 Performance Budget と Before / After degradation rule を適用する |
| Manual high load | Stress / Spike / Soak。capacity、耐障害性、長時間安定性を検証するときに固定Docker環境で実行する | 処理限界、回復、resource usage、budget逸脱を記録し、意図しないerrorや未回復を許容しない |

shared CI runner の揺らぎが大きい間は p95 / p99 の絶対値を merge-blocking gate にしない。
専用 runner で分散が許容範囲に収まることを確認できた場合のみ、記録済み baseline と別PRの
根拠をもって latency gate を昇格する。CI を軽くするために認証、CSRF、response check を
省略してはならない。

### Baseline And Degradation Rule

初回 baseline は大規模 preset と固定Docker環境を用い、Laravel direct と BFF の Load を
各3回実行した中央値から作る。#208 で baseline を取得した後、暫定 Performance Budget の
妥当性を再評価する。値を維持、厳格化、緩和するいずれの場合も、結果と理由を docs とPRへ
残し、計測なしに budget を緩和しない。

Before / After は base revision と candidate revision について、それぞれ同じ条件で3回実行した
中央値を比較する。次のいずれかを満たす場合は性能劣化と判定する。

- p95 または p99 latency が 10% を超えて悪化する。
- 同じ arrival rate で実効 throughput が 10% を超えて低下する。
- error rate が 0.5 percentage point 以上増加する、または1%に達する。
- expected request count の99%を完了できない、または dropped iteration が発生する。
- 暫定または再評価後の Performance Budget を超える。

p50 の 15% を超える悪化は warning とし、p95 / p99、query、resource metrics と合わせて
原因を確認する。degradation 判定が出た場合は同条件の3回を再実行し、再現することを確認する。
再現した劣化は修正するか、trade-off、影響、承認理由、follow-up Issue をPRへ記録する。

### Reproducibility And Security

比較可能な結果には、少なくとも次を記録する。

- base / candidate の commit SHA、計測日時、scenario、endpoint、経路。
- Docker image / dependency version、OS / CPU / memory、Docker resource limit、Xdebug の状態。
- dataset seed、table count、DB size、warm-up、計測時間、arrival rate、VU、request distribution。
- request count、実効 RPS、p50 / p95 / p99、error rate、dropped iteration、threshold結果。

比較中は Docker 構成、resource limit、dataset、seed、環境変数、負荷生成元を固定し、
Xdebug は無効にする。他の高負荷処理を同じホストで動かさず、条件差がある結果は baseline と
して採用しない。

負荷試験専用ユーザーだけを使い、credential、JWT、session cookie、CSRF token を repository、
script既定値、結果、ログへ保存しない。secret は実行時に安全な入力から渡し、出力時に redact
する。BFF scenario は通常の BrowserSession / CSRF 境界を、Laravel direct scenario は通常の
JWT検証を通し、性能のために認証・認可・server-side validation を無効化しない。

負荷試験はローカルまたは明示的に許可された隔離環境だけを対象にする。production や共有環境へ
高負荷を送らず、Stress / Spike / Soak は対象、上限、停止条件を確認してから実行する。

## Local Reproducibility

The project must be runnable with Docker Compose and lockfiles.

Required local prerequisites:

- Docker Desktop or compatible Docker environment
- Node 24 / pnpm for docs, frontend, BFF, or E2E work outside the containers
- Backend Composer / PHP commands should run inside the `backend-php` container

Version hints:

- `mise.toml` pins Node `24` and Python `3.14`.
- Backend dependencies are locked by `backend/composer.lock`.
- Frontend dependencies are locked by `frontend/pnpm-lock.yaml`.
- BFF dependencies are locked by `bff/pnpm-lock.yaml`.
- The actual package versions are resolved from each package manifest and lockfile.

Docker services:

| Service | Purpose | Port |
| --- | --- | --- |
| `frontend` | Vite dev server | `3005` |
| `bff` | Hono BFF for BrowserSession, CSRF, and Public API forwarding | `3006` |
| `backend-nginx` | Laravel API through Nginx | `8080` |
| `backend-php` | PHP-FPM / Laravel runtime | internal |
| `db` | MySQL | host `3309`, container `3306` |
| `redis` | BFF BrowserSession store | `6379` |
| `mailpit` | Local SMTP / mail UI | SMTP `1025`, UI `8025` |

Expected setup flow:

```bash
docker compose up -d
docker compose exec backend-php composer install
cp backend/.env.example backend/.env
perl -0pi -e 's/DB_HOST=.*/DB_HOST=db/; s/DB_PORT=.*/DB_PORT=3306/; s/DB_DATABASE=.*/DB_DATABASE=real_world/; s/DB_USERNAME=.*/DB_USERNAME=real_world/; s/DB_PASSWORD=.*/DB_PASSWORD=secret/' backend/.env
JWT_SECRET="$(docker compose exec -T backend-php php -r 'echo bin2hex(random_bytes(32));')" perl -0pi -e 's/JWT_SIGNING_SECRET=.*/JWT_SIGNING_SECRET=$ENV{JWT_SECRET}/' backend/.env
docker compose exec backend-php php artisan key:generate
docker compose exec backend-php php artisan migrate
docker compose exec frontend pnpm install
```

Authentication migration 後の Docker topology:

```text
Browser -> frontend origin (:3005) /api/* -> bff -> backend-nginx (private Docker network)
```

- Target service として Hono + TypeScript の `bff` を追加し、BrowserSession、CSRF、Public API forwarding を担わせる。
- Browser が利用する origin は React assets と BFF API を同一 origin として提供する。
- Local development では frontend dev proxy または frontend-facing gateway が `/api/*` を `bff` service へ転送する。
- `backend-nginx:8080` は Public API contract の直接検証用に利用できるが、first-party frontend の認証付き通信先にはしない。
- BFF は `backend-nginx` へ server-to-server request を行い、server-side に保持した JWT だけを `Authorization: Token <jwt>` として送る。
- `compose.yml` では BFF が private network 上の `backend-nginx` と `redis` に接続し、frontend service は `/api/*` を `BFF_PROXY_TARGET` へ proxy する。

`.env` handling:

- Use `backend/.env.example` as the template.
- `backend/.env` is ignored and must not be committed.
- Docker local setup expects `DB_HOST=db`, `DB_DATABASE=real_world`, `DB_USERNAME=real_world`, `DB_PASSWORD=secret`, and a non-empty random `JWT_SIGNING_SECRET`.
- Changes needed by every developer go into `.env.example` or docs, not a personal `.env`.

## README Requirements

The root README should keep the following information current:

- Project purpose and stack summary
- Required local tools
- Docker startup and shutdown commands
- Backend setup commands
- Frontend setup commands
- Service URLs and ports
- Test, lint, type-check, and static analysis commands
- Main directory map
- Links to requirements, rules, architecture, labels, and AI harness docs
- Known setup caveats such as first-run dependency install or `.env` creation

README should remain a quick start. Detailed rules belong in `docs/`.

## CI / QA Gate

Before PR review, run the checks relevant to touched areas.

Frontend changes:

```bash
cd frontend && pnpm tsc -b --noEmit
cd frontend && pnpm vitest run
cd frontend && pnpm eslint .
```

Backend changes:

```bash
cd backend && php artisan test
cd backend && ./vendor/bin/pint --test
cd backend && ./vendor/bin/phpstan analyse
```

Docs-only changes:

```bash
git diff --check
```

Security-sensitive or dependency changes:

```bash
cd backend && composer audit --locked
cd frontend && pnpm audit
cd bff && pnpm audit
```

## Development Experience Requirements

- Commands in README and PR templates must be copy-pasteable.
- Long-running checks should be documented separately from fast local checks.
- Test failures should point to behavior, not only snapshots or implementation details.
- New dependencies require a short reason in the PR body.
- Generated files, logs, caches, and personal environment files must stay out of commits.
- When local setup changes, README and this document should be updated in the same PR.
