# データベース設計ルール

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| テーブル | 複数形 snake_case | `users`, `order_items` |
| カラム | snake_case | `first_name`, `created_at` |
| 外部キー | `<単数形テーブル名>_id` | `user_id`, `order_id` |
| 真偽値カラム | `is_` / `has_` プレフィックス | `is_active`, `has_verified` |
| 日時カラム | `_at` サフィックス | `published_at`, `deleted_at` |
| 中間テーブル | 単数形をアルファベット順で結合 | `order_product`, `role_user` |

## 設計原則

### 必須カラム

全テーブルに以下を含める:

- `id` - `bigIncrements` (主キー)
- `created_at` / `updated_at` - `timestamps()`

### 論理削除

- 物理削除は原則禁止。`SoftDeletes` トレイトを使用
- `deleted_at` カラムで論理削除を管理

### ENUM 型

- **データベースの ENUM 型は使用禁止**
- PHP Backed Enum + `string` / `int` カラムで管理

```php
// Good: PHP Backed Enum
enum UserStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
}

// マイグレーション: string カラムとして定義
$table->string('status')->default(UserStatus::Active->value);
```

### インデックス

- 外部キーには自動でインデックスが付く（Laravel）
- 検索条件に頻繁に使うカラムにはインデックスを追加
- 複合インデックスはクエリパターンに合わせて定義

## マイグレーション規約

- **既存マイグレーションの編集禁止**: 変更は新しいマイグレーションで行う
- **`down()` メソッド必須**: ロールバック可能にする
- マイグレーション名は操作内容を明確に: `create_users_table`, `add_email_to_users_table`
- 本番データに影響するマイグレーションはデータ移行スクリプトを別途用意

## DB スキーマ管理

- スキーマ定義は `docs/dbschema.dbml` に DBML 形式で記録
- テーブル追加・変更時に `dbschema.dbml` も同時更新すること
