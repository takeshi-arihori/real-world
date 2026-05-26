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

- Public API 認証は **JWT** を使用し、外部契約は `Authorization: Token <token>` と `user.token` の RealWorld 互換形式を維持する
- JWT の署名方式は `HS256` とし、検証時に受理する algorithm を固定する
- JWT signing secret は `APP_KEY` と分離し、runtime secret management から注入して `config/*` 経由で参照する。実値を `.env`、git 管理ファイル、ログ、フロントエンドへ露出しない
- JWT は `sub`、`iat`、`exp` claim を必須とし、有効期限は発行から 60 分とする
- 期限切れ・署名不正・形式不正の token は `401 Unauthorized` として扱い、optional authentication でもゲストに降格させない
- First-party frontend は JWT を受け取らず、Backend が管理する opaque browser session を `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` cookie で扱う
- Browser session は logout で server-side に失効させる。JWT の browser storage、JWT refresh token、public token revocation list は導入しない
- 認可は **Policy / Gate** で実装
- ルートミドルウェアで認証チェック
- CORS 設定を適切に行う

## 依存ライブラリ管理

- 定期的に `composer audit` / `pnpm audit` で脆弱性チェック
- メジャーバージョンアップは影響範囲を確認してから実施
- 不要なパッケージは速やかに削除

## CSRF / XSS 対策

- Laravel の CSRF トークン機構を有効化
- Cookie 認証を使用する browser request の `POST` / `PUT` / `PATCH` / `DELETE` は CSRF 検証を必須とする
- JWT、session identifier、refresh token を `localStorage` / `sessionStorage` / frontend state に保存しない
- ユーザー入力の出力時は必ずエスケープ（Blade: `{{ }}`、React: JSX が自動エスケープ）
- Cookie は `HttpOnly`, `Secure`, `SameSite` を設定
