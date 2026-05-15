# バックエンド開発ルール

## 技術スタック

- Laravel 13
- PHP 8.4
- Pest 4.4 (テスト)
- Laravel Pint (リント/フォーマッタ)

## アーキテクチャ

### 方針

DDD（ドメイン駆動設計）ベースの4層アーキテクチャを採用する。

> **ドメイン設計仕様の参照**
> - Bounded Context 定義: [`docs/arch/bounded-contexts.md`](../arch/bounded-contexts.md)
> - ユビキタス言語定義: [`docs/arch/ubiquitous-language.md`](../arch/ubiquitous-language.md)

```
Presentation → Application → Domain ← Infrastructure
```

**依存方向ルール**: 外側から内側へのみ依存する。Domain 層は他のどの層にも依存しない。

| レイヤー | 責務 | 依存先 |
|---------|------|--------|
| **Domain** | ビジネスルール・ドメインロジック | なし（最内層） |
| **Application** | ユースケースの実行・調整 | Domain |
| **Infrastructure** | 永続化・外部サービス連携 | Domain, Application |
| **Presentation** | HTTP リクエスト/レスポンス | Application |

### 各レイヤーの責務と禁止事項

#### Domain 層

- **責務**: Entity, ValueObject, Domain Service, Repository Interface, Domain Event, Specification
- **禁止**: Eloquent 直接利用、フレームワーク依存、外部 API 呼び出し、`use Illuminate\*`

#### Application 層

- **責務**: UseCase（Command / Query）、DTO、Application Service
- **禁止**: ビジネスルールの記述（Domain に委譲する）、直接 DB アクセス、HTTP 関連の処理
- 1 ユースケース = 1 クラス（単一責務）

#### Infrastructure 層

- **責務**: Repository 実装、Eloquent Model、外部 API クライアント、メール送信、ファイルストレージ
- **禁止**: ビジネスルールの記述

#### Presentation 層

- **責務**: Controller, FormRequest, JsonResource, Middleware
- **禁止**: ビジネスロジック記述（薄い Controller を維持）

### DDD ディレクトリ構成

```
backend/app/
├── Domain/                         # ドメイン層
│   └── <BoundedContext>/           # 例: User, Order
│       ├── Entities/               # エンティティ
│       ├── ValueObjects/           # 値オブジェクト
│       ├── Repositories/           # Repository インターフェース
│       ├── Services/               # ドメインサービス
│       ├── Events/                 # ドメインイベント
│       ├── Specifications/         # 仕様パターン
│       └── Exceptions/             # ドメイン例外
├── Application/                    # アプリケーション層
│   └── <BoundedContext>/
│       ├── Commands/               # 書き込み系ユースケース
│       ├── Queries/                # 読み取り系ユースケース
│       └── DTOs/                   # データ転送オブジェクト
├── Infrastructure/                 # インフラストラクチャ層
│   ├── Persistence/
│   │   ├── Models/                 # Eloquent モデル（永続化専用）
│   │   └── Repositories/          # Repository 実装
│   ├── External/                   # 外部サービスクライアント
│   └── Providers/                  # サービスプロバイダ（DI バインド）
├── Presentation/                   # プレゼンテーション層
│   └── Http/
│       ├── Controllers/            # コントローラー（薄く保つ）
│       ├── Requests/               # FormRequest（バリデーション）
│       └── Resources/              # JsonResource（レスポンス整形）
├── Enums/                          # PHP Backed Enum（共通）
└── Policies/                       # 認可ポリシー
```

### Repository ルール

- **Interface は Domain 層**に配置: `Domain/<Context>/Repositories/<Name>RepositoryInterface.php`
- **実装は Infrastructure 層**に配置: `Infrastructure/Persistence/Repositories/Eloquent<Name>Repository.php`
- サービスプロバイダで Interface と実装をバインドする
- Repository は集約ルート（Aggregate Root）ごとに1つ

```php
// Domain 層 — Interface
namespace App\Domain\User\Repositories;

interface UserRepositoryInterface
{
    public function findById(UserId $id): ?User;
    public function save(User $user): void;
}

// Infrastructure 層 — 実装
namespace App\Infrastructure\Persistence\Repositories;

class EloquentUserRepository implements UserRepositoryInterface
{
    // Eloquent を使った実装
}
```

### Query / Command 分離（CQRS-lite）

読み取り系（Query）と書き込み系（Command）をクラスレベルで分離する。

- **Command**: 状態を変更する操作。Domain Entity を経由して処理する
- **Query**: 読み取り専用。パフォーマンスのため Eloquent を直接利用してもよい

```
Application/<Context>/Commands/CreateUserCommand.php    # 書き込み
Application/<Context>/Queries/GetUserByIdQuery.php      # 読み取り
```

### Entity / ValueObject ルール

#### Entity

- 一意な識別子（ID）を持つ
- ライフサイクルを通じて同一性を維持する
- ビジネスルールのバリデーションを内包する（常に整合性のある状態を保つ）
- setter は公開しない。状態変更は意味のあるメソッド名で表現する

```php
// Good: 意味のあるメソッド名
$user->changeEmail(new Email('new@example.com'));

// Bad: setter
$user->setEmail('new@example.com');
```

#### ValueObject

- 不変（immutable）。一度生成したら値を変更しない
- 等価性は値で判定する（ID ではない）
- 自身のバリデーションをコンストラクタで行う
- プリミティブ型を意味のある型で包む

```php
// ValueObject の例
final readonly class Email
{
    public function __construct(public string $value)
    {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("Invalid email: {$value}");
        }
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
```

### Eloquent ルール

- Eloquent Model は **Infrastructure 層の永続化モデル**として扱う
- Domain Entity と Eloquent Model は分離する（同一クラスにしない）
- Repository 実装内で Entity ↔ Model の変換を行う
- リレーション定義・スコープ・アクセサは Eloquent Model に記述する

### Controller ルール

- リクエスト受付・レスポンス返却のみ。ビジネスロジック禁止（薄い Controller）
- FormRequest でバリデーション、UseCase（Command/Query）に処理を委譲する
- Controller 内で直接 Repository や Eloquent を呼ばない

```php
// Good
public function store(CreateUserRequest $request, CreateUserCommand $command): JsonResponse
{
    $dto = CreateUserDto::fromRequest($request);
    $user = $command->execute($dto);
    return new UserResource($user);
}

// Bad: Controller にロジックが漏れている
public function store(Request $request): JsonResponse
{
    $user = User::create($request->all());
    // ...
}
```

### 例外とエラー処理

- Domain 層の例外は `Domain/<Context>/Exceptions/` に配置する
- 業務エラーとシステムエラーを区別する
  - **業務エラー**: `DomainException` を継承。ユーザーに意味のあるメッセージを返す
  - **システムエラー**: `RuntimeException` を継承。ログに記録し汎用メッセージを返す
- Presentation 層の例外ハンドラで Domain 例外を適切な HTTP ステータスコードに変換する

### PHPDoc / コメント方針

- クラスの public / protected / private メソッドには PHPDoc を付け、処理内容ではなくメソッドが担う契約・意図を短く書く
- 配列 shape や list など PHP の型宣言だけで表現できない返り値は `@return` で明示する
- 単純な代入やフレームワーク既定動作の説明だけのコメントは避ける

### トランザクション方針

- トランザクションは **Application 層（UseCase）** で管理する
- Domain 層ではトランザクションを意識しない
- `DB::transaction()` を UseCase 内で使用する

```php
// Application 層
public function execute(CreateOrderDto $dto): Order
{
    return DB::transaction(function () use ($dto) {
        $order = Order::create($dto);
        $this->orderRepository->save($order);
        return $order;
    });
}
```

### 認証・認可方針

- 認証: Laravel 標準の認証機構（Sanctum 等）を使用する
- 認可: Policy クラスで制御する。Controller の `authorize()` または FormRequest の `authorize()` で呼び出す
- Domain 層に認証・認可ロジックを含めない

### DDD 命名ルール

| 対象 | 命名規則 | 例 |
|------|---------|-----|
| Entity | PascalCase（ドメイン用語） | `User`, `Order`, `Product` |
| ValueObject | PascalCase（値の意味を表す） | `Email`, `Money`, `Address` |
| Repository Interface | `<Entity>RepositoryInterface` | `UserRepositoryInterface` |
| Repository 実装 | `Eloquent<Entity>Repository` | `EloquentUserRepository` |
| Command（書き込み） | `<動詞><名詞>Command` | `CreateUserCommand`, `CancelOrderCommand` |
| Query（読み取り） | `Get<名詞>Query` / `List<名詞>Query` | `GetUserByIdQuery`, `ListOrdersQuery` |
| DTO | `<動詞><名詞>Dto` | `CreateUserDto`, `UpdateOrderDto` |
| Domain Event | `<名詞><過去分詞>` | `OrderPlaced`, `UserRegistered` |
| Domain Exception | `<名詞><状態>Exception` | `UserNotFoundException`, `OrderAlreadyCancelledException` |
| Specification | `<条件>Specification` | `ActiveUserSpecification` |

### アンチパターン一覧

以下のパターンは禁止する。

| アンチパターン | 問題点 | 正しいアプローチ |
|--------------|--------|----------------|
| Controller にビジネスロジック | 肥大化・テスト困難 | UseCase に委譲する |
| Domain 層で Eloquent 使用 | フレームワーク依存 | Repository Interface で抽象化する |
| Entity に setter を公開 | 不整合な状態を許容 | 意味のあるメソッド名で状態変更する |
| UseCase で複数責務 | 単一責務違反 | 1 UseCase = 1 責務に分割する |
| Domain 層で外部 API 呼び出し | インフラ依存 | Interface を Domain に定義し Infrastructure で実装する |
| Eloquent Model を API レスポンスに直接返却 | 内部構造の漏洩 | JsonResource で整形する |
| トランザクションを Domain 層で管理 | インフラ関心事の混入 | Application 層で管理する |
| ValueObject をプリミティブ型で代用 | 型安全性の欠如 | 専用の ValueObject クラスを作成する |

### 判断基準フローチャート

新しいロジックを追加する際の配置判断:

```
1. HTTP リクエスト/レスポンスに関する処理か？
   → Yes: Presentation 層（Controller / FormRequest / Resource）

2. 外部サービス・DB アクセスの実装か？
   → Yes: Infrastructure 層（Repository 実装 / External）

3. ユースケースの調整・トランザクション管理か？
   → Yes: Application 層（Command / Query）

4. ビジネスルール・ドメインロジックか？
   → Yes: Domain 層（Entity / ValueObject / Domain Service）

5. 上記に当てはまらない共通処理か？
   → Enum, Helper, または適切なレイヤーの共通モジュールに配置
```

## PHP コーディング規約

### 必須

- `declare(strict_types=1)` を全PHPファイルの先頭に記述
- 戻り値の型宣言必須（`void` 含む）
- `match` 式を `switch` より優先

### 禁止

- `eval()`, `exec()`, `shell_exec()` の使用
- `@` によるエラー抑制
- `global` 変数

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| クラス | PascalCase | `UserService`, `OrderController` |
| メソッド | camelCase | `findByEmail()`, `createOrder()` |
| プロパティ | camelCase | `$userName`, `$isActive` |
| 定数 | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Enum | PascalCase (Backed Enum) | `UserStatus: string` |

## Laravel 規約

### バリデーション

- **FormRequest 必須**: コントローラーに直接バリデーションロジックを書かない
- `authorize()` メソッドで認可チェックも行う

### レスポンス

- **JsonResource 必須**: Eloquent モデルを直接返さない
- コレクションは `ResourceCollection` または `::collection()` を使用

### クエリ

- **Eager Loading 徹底**: N+1問題を防ぐため `with()` を使用
- `env()` は `config/` 内でのみ使用。アプリケーションコードで直接呼ばない

### ルーティング

- API ルートは `routes/api.php` に定義
- リソースルート `Route::apiResource()` を優先
- ルート名は必ず付ける

## テスト方針

### ツール

- Pest 4.4（Laravel プラグイン付き）

### 方針

- Feature テスト: HTTP リクエスト経由でエンドポイントをテスト
- Unit テスト: Service クラスのロジックをテスト
- テストデータは Factory + Faker で生成
- テスト間の独立性: `RefreshDatabase` トレイト使用

### 実行コマンド

```bash
cd backend && php artisan test                       # 全テスト実行
cd backend && php artisan test --filter=<テスト名>    # 個別テスト実行
cd backend && php artisan test --coverage            # カバレッジ付き
cd backend && ./vendor/bin/pint --test               # リント確認
cd backend && ./vendor/bin/pint                      # リント自動修正
```
