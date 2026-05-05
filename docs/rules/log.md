# ログ運用ルール

## バックエンド (Laravel)

### ログレベルの使い分け

| レベル | 用途 | 例 |
|-------|------|-----|
| `emergency` | システム全体が使用不能 | データベース接続完全喪失 |
| `critical` | 即座の対応が必要 | 決済サービス接続失敗 |
| `error` | 実行時エラー | API呼び出し失敗、例外捕捉 |
| `warning` | 異常だが処理は継続可能 | 非推奨APIの使用、レート制限接近 |
| `info` | 重要なビジネスイベント | ユーザー登録、注文完了 |
| `debug` | デバッグ情報 | クエリパラメータ、処理時間 |

### 構造化ログ

コンテキスト配列を必ず付与する:

```php
// Good
Log::info('Order created', [
    'order_id' => $order->id,
    'user_id' => $order->user_id,
    'total' => $order->total,
]);

// Bad
Log::info("Order {$order->id} created by user {$order->user_id}");
```

### 禁止事項

- **個人情報のログ出力禁止**: パスワード、トークン、クレジットカード番号、メールアドレス等
- `dd()`, `dump()` を本番コードに残さない
- `Log::debug()` は開発環境でのみ出力（`.env` の `LOG_LEVEL` で制御）

## フロントエンド (React)

### エラーバウンダリ

- アプリケーション全体を Error Boundary でラップ
- 予期せぬエラーをキャッチし、ユーザーにフォールバック UI を表示

### 禁止事項

- **`console.log` を本番コードに残さない**
- `console.error` / `console.warn` は開発時のみ使用
- 本番環境のエラー通知は外部サービス（Sentry等）を使用
