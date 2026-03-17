# バックエンド開発ルール

## 技術スタック

- Laravel 12
- PHP 8.3
- Pest 4.4 (テスト)
- Laravel Pint (リント/フォーマッタ)

## アーキテクチャ

### レイヤー構成

```
Controller → Service → Model
```

- **Controller**: リクエスト受付・レスポンス返却のみ。ビジネスロジック禁止（薄い Controller）
- **Service**: ビジネスロジックを集約。1メソッド1責務
- **Model**: Eloquent モデル。リレーション定義・スコープ・アクセサ

### ディレクトリ構成

```
api/app/
├── Http/
│   ├── Controllers/    # コントローラー（薄く保つ）
│   ├── Requests/       # FormRequest（バリデーション）
│   └── Resources/      # JsonResource（レスポンス整形）
├── Models/             # Eloquent モデル
├── Services/           # ビジネスロジック
├── Enums/              # PHP Backed Enum
├── Exceptions/         # カスタム例外
└── Policies/           # 認可ポリシー
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
cd api && php artisan test                       # 全テスト実行
cd api && php artisan test --filter=<テスト名>    # 個別テスト実行
cd api && php artisan test --coverage            # カバレッジ付き
cd api && ./vendor/bin/pint --test               # リント確認
cd api && ./vendor/bin/pint                      # リント自動修正
```
