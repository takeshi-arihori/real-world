# セキュリティルール

## 絶対禁止事項

- `.env` ファイルの編集・コミット
- シークレット・APIキーのハードコーディング
- `eval()`, `exec()`, `shell_exec()` の使用
- `innerHTML` / `dangerouslySetInnerHTML` の無検証使用
- SQL 文の文字列結合（Eloquent / Query Builder を使用）

## バリデーション

### バックエンド

- **FormRequest 必須**: 全ての入力は FormRequest でバリデーション
- サーバーサイドバリデーションが正（フロントエンドはUIフィードバック用）
- ファイルアップロード: MIMEタイプ・サイズ制限を必ず設定

### フロントエンド

- フロントエンドのバリデーションは**UIフィードバック目的のみ**
- セキュリティ上の検証はサーバーサイドに依存

## 認証・認可

- **Laravel Sanctum** をAPI認証に使用
- 認可は **Policy / Gate** で実装
- ルートミドルウェアで認証チェック
- CORS 設定を適切に行う

## 依存ライブラリ管理

- 定期的に `composer audit` / `pnpm audit` で脆弱性チェック
- メジャーバージョンアップは影響範囲を確認してから実施
- 不要なパッケージは速やかに削除

## CSRF / XSS 対策

- Laravel の CSRF トークン機構を有効化
- ユーザー入力の出力時は必ずエスケープ（Blade: `{{ }}`、React: JSX が自動エスケープ）
- Cookie は `HttpOnly`, `Secure`, `SameSite` を設定
