# フロントエンド開発ルール

## 技術スタック

- React 19 (Functional Components + Hooks)
- TypeScript 5.9
- Vite 8
- Vitest + Testing Library (テスト)
- ESLint (リント)

## コーディング規約

### 型安全

- `any` 禁止。`unknown` を使い、型ガードで絞り込む
- `as` キャスト最小化。使用時はコメントで理由を記載
- 戻り値の型は関数シグネチャで明示（推論に頼らない）

### コンポーネント設計

- Functional Components + Hooks のみ（クラスコンポーネント禁止）
- `React.FC` 不使用。Props を引数で直接型付けする
- 名前付きエクスポート（`export default` 禁止）

```tsx
// Good
interface Props {
  name: string;
}
export function UserCard({ name }: Props) { ... }

// Bad
const UserCard: React.FC<Props> = ({ name }) => { ... }
export default UserCard;
```

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `UserCard`, `LoginForm` |
| カスタムフック | camelCase + `use` プレフィックス | `useAuth`, `useUserList` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| ファイル（コンポーネント） | PascalCase.tsx | `UserCard.tsx` |
| ファイル（フック） | camelCase.ts | `useAuth.ts` |
| ファイル（ユーティリティ） | camelCase.ts | `formatDate.ts` |

## ディレクトリ構成

```
web/src/
├── app/               # アプリケーション設定
│   ├── routes/         # ルーティング（Pages を配置）
│   └── providers/      # プロバイダー
├── features/          # 機能モジュール（ドメイン単位）
│   └── <feature>/
│       ├── api/        # feature固有のAPI関数
│       ├── components/ # UIコンポーネント
│       ├── hooks/      # カスタムフック
│       ├── schemas/    # バリデーションスキーマ（Zod等）
│       ├── types/      # 型定義
│       ├── utils/      # ユーティリティ
│       └── __tests__/  # テスト
├── shared/            # 共通UI・フック・型・ユーティリティ
│   ├── components/     # 共通UIコンポーネント
│   ├── hooks/          # 共通フック
│   ├── types/          # 共通型定義
│   └── utils/          # 共通ユーティリティ
├── lib/               # インフラ横断（APIクライアント、認証、定数）
└── test/              # テスト設定
    └── setup.ts
```

### `shared/` と `lib/` の役割分担

| ディレクトリ | 役割 | 例 |
|-------------|------|-----|
| `shared/` | UI寄りの共有部品 | `Button`, `useDisclosure`, `formatDate` |
| `lib/` | 技術基盤・インフラ | APIクライアント設定, トークン管理, 環境変数定数 |

### 依存方向の制約

- `features/A` → `features/B` の直接参照禁止
- `features/*` → `shared/*` は許可
- `features/*` → `lib/*` は許可
- `shared/*` → `features/*` は禁止
- `shared/*` → `lib/*` は許可
- `lib/*` → `features/*`, `shared/*` は禁止
- `app/` → `features/*`, `shared/*`, `lib/*` は許可

```
app/ ──→ features/* ──→ shared/*
  │          │              │
  │          ↓              ↓
  └──────→ lib/* ←─────────┘
```

## Pages と Features の責務分離

### Pages（`app/routes/` 配下）

- ルーティング定義 + レイアウト構成のみ
- ビジネスロジックを持たない
- feature のコンポーネントを組み合わせて画面を構成する

```tsx
// Good: Pages はレイアウトと feature の組み合わせ
export function UserPage() {
  return (
    <MainLayout>
      <UserProfile />
      <UserActivityFeed />
    </MainLayout>
  );
}

// Bad: Pages にビジネスロジック
export function UserPage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { fetchUser(id).then(setUser); }, [id]);
  // ... ロジックが Pages に漏れている
}
```

### Features（`features/<feature>/` 配下）

- ドメインロジック・データ取得・状態管理を担当
- 自己完結した機能単位

## Feature 設計ルール

### feature 内部ディレクトリの責務

| ディレクトリ | 責務 | 配置するもの |
|-------------|------|-------------|
| `api/` | API通信 | リクエスト関数、レスポンス型変換 |
| `components/` | UI表示 | feature固有のコンポーネント |
| `hooks/` | ロジック | データ取得・状態管理のカスタムフック |
| `schemas/` | バリデーション | Zod スキーマ、フォームバリデーション |
| `types/` | 型定義 | feature固有の型・インターフェース |
| `utils/` | 純粋関数 | feature固有のヘルパー |
| `__tests__/` | テスト | 上記すべてのテスト |

### 公開API（barrel export）

各 feature は `index.ts` で公開インターフェースを明示する。外部からは `index.ts` 経由のみでアクセスする。

```tsx
// features/user/index.ts
export { UserProfile } from './components/UserProfile';
export { UserActivityFeed } from './components/UserActivityFeed';
export { useUser } from './hooks/useUser';
export type { User } from './types';
```

```tsx
// Good: barrel export 経由
import { UserProfile } from '@/features/user';

// Bad: 内部パスを直接参照
import { UserProfile } from '@/features/user/components/UserProfile';
```

## API 連携ルール

### 配置場所

- feature固有のAPI関数 → `features/<feature>/api/`
- HTTPクライアント設定・インターセプター → `lib/`

### 型変換方針

- APIレスポンス（snake_case）→ フロントエンド型（camelCase）の変換は `api/` 層で行う
- コンポーネント・フックは常に camelCase の型を扱う

```tsx
// features/user/api/getUser.ts
import { apiClient } from '@/lib/apiClient';
import type { User } from '../types';

interface UserResponse {
  id: number;
  full_name: string;
  created_at: string;
}

export async function getUser(id: number): Promise<User> {
  const res = await apiClient.get<UserResponse>(`/users/${id}`);
  return {
    id: res.data.id,
    fullName: res.data.full_name,
    createdAt: new Date(res.data.created_at),
  };
}
```

### 認証トークン管理

- トークン管理は `lib/` に集約する
- 各 feature の API 関数は認証を意識しない（APIクライアントのインターセプターで処理）

## 状態管理ルール

### 使い分け基準

| スコープ | 手段 | 例 |
|---------|------|-----|
| コンポーネントローカル | `useState`, `useReducer` | フォーム入力値、開閉状態 |
| feature 内共有 | Context または カスタムフック | feature内の複数コンポーネントで共有する状態 |
| グローバル | Context + Provider（`app/providers/`） | 認証情報、テーマ |

### サーバ由来データ

- サーバ状態はフロントの状態管理に混ぜない
- API レスポンスのキャッシュ・再取得はデータフェッチライブラリ（TanStack Query 等）に委ねる
- `useState` に API レスポンスを格納して手動管理しない

## フォームルール

### バリデーション

- バリデーションスキーマは `schemas/` に Zod で定義する
- バックエンドのバリデーションルールと一致させる（二重管理に注意）

### 送信状態

- 送信中（`isSubmitting`）はボタン無効化 + ローディング表示
- 二重送信を防止する

### エラー表示

- フィールドレベルエラーはフィールド直下に表示
- フォーム全体のエラー（サーバエラー等）はフォーム上部に表示

## エラーハンドリングルール

### Error Boundary

- 各 feature のルートに Error Boundary を配置する
- アプリケーション全体の Error Boundary を `app/` に配置する

### API エラー

- HTTPステータスコードに応じたハンドリングを `lib/` のAPIクライアントで共通化する
- 401 → 認証画面へリダイレクト
- 403 → 権限エラー表示
- 422 → バリデーションエラーをフォームに反映
- 500 → 汎用エラー表示

### ユーザーフィードバック

- エラーメッセージはユーザーが理解できる表現にする（技術用語を避ける）
- 操作成功時はトースト等で通知する

## Hooks ルール

### カスタムフック設計指針

- 1フック1責務（データ取得と状態管理を1つに混ぜない）
- フックは必ずテスト可能に設計する
- feature固有のフック → `features/<feature>/hooks/`
- 複数 feature で使うフック → `shared/hooks/`

```tsx
// Good: 1責務
export function useUser(id: number): { user: User | null; isLoading: boolean } { ... }
export function useUpdateUser(): { update: (data: UpdateUserInput) => Promise<void>; isUpdating: boolean } { ... }

// Bad: 複数責務を混在
export function useUser(id: number): {
  user: User | null;
  isLoading: boolean;
  update: (data: UpdateUserInput) => Promise<void>;
  delete: () => Promise<void>;
} { ... }
```

## UI コンポーネントルール

### 共通 vs feature固有の判断基準

| 基準 | 配置先 |
|------|--------|
| 2つ以上の feature で使う or 汎用的なUI部品 | `shared/components/` |
| 1つの feature でのみ使う | `features/<feature>/components/` |
| 最初は feature 固有で作り、再利用時に `shared/` へ昇格させる | — |

### コンポーネント設計原則

- Props はプリミティブ型を優先する（ドメインオブジェクトをそのまま渡さない）
- 表示ロジックとビジネスロジックを分離する（Container/Presentational を意識）
- 子コンポーネントが多い場合はディレクトリにまとめる

```
features/user/components/
├── UserProfile/
│   ├── UserProfile.tsx
│   ├── UserAvatar.tsx
│   └── index.ts
└── UserActivityFeed.tsx
```

## バックエンドとの境界ルール

### Laravel JsonResource との対応

- バックエンドの JsonResource が返す JSON 構造に対応するレスポンス型を `api/` 層に定義する
- フロントエンド内部の型（camelCase）とは別に管理する

### 型の二重管理防止

- APIレスポンス型は `api/` 層にのみ定義する（他の層に漏らさない）
- フロントエンド内部で使う型は `types/` に定義する
- `api/` 層の変換関数が両者の橋渡しをする

```
[Backend JsonResource] → [api/ レスポンス型] → [変換関数] → [types/ フロントエンド型]
```

## アンチパターン一覧

| アンチパターン | 理由 | 代替 |
|--------------|------|------|
| feature 間の直接 import | 密結合になる | `shared/` に昇格 or イベント経由 |
| Pages にビジネスロジック | 責務違反 | feature のフック・コンポーネントに移動 |
| `useState` で API レスポンスを管理 | キャッシュ・再取得が困難 | データフェッチライブラリを使用 |
| コンポーネント内で直接 `fetch` | テスト困難・関心の混在 | `api/` 層 + カスタムフック |
| barrel export なしの feature | 内部構造が漏洩する | `index.ts` で公開APIを明示 |
| `any` での型キャスト | 型安全性の破壊 | `unknown` + 型ガード |
| グローバル state の乱用 | 不要な再レンダリング・追跡困難 | 適切なスコープの状態管理 |
| バリデーションのフロントのみ実装 | セキュリティリスク | バックエンドと両方で実装 |

## 実装時の判断基準フローチャート

### 新しいコンポーネントの配置先

```
新しいコンポーネントを作る
  → 特定の feature でのみ使う？
    → Yes → features/<feature>/components/
    → No → 汎用UI部品？
      → Yes → shared/components/
      → No → 技術基盤？
        → Yes → lib/
        → No → shared/components/
```

### 新しいフックの配置先

```
新しいフックを作る
  → 特定の feature のデータ/ロジック？
    → Yes → features/<feature>/hooks/
    → No → UI操作の共通化？
      → Yes → shared/hooks/
      → No → インフラ関連（認証・API等）？
        → Yes → lib/
        → No → shared/hooks/
```

### 状態管理の選択

```
状態を管理したい
  → サーバ由来のデータ？
    → Yes → データフェッチライブラリ（TanStack Query 等）
    → No → 1コンポーネント内で完結？
      → Yes → useState / useReducer
      → No → 1 feature 内で共有？
        → Yes → Context or カスタムフック
        → No → app/providers/ のグローバル Context
```

## テスト方針

### ツール

- Vitest + `@testing-library/react` + `@testing-library/jest-dom`
- ユーザー操作は `@testing-library/user-event` を使用

### 方針

- カバレッジ目標: 80%
- コンポーネントテストはユーザー視点で書く（実装詳細に依存しない）
- `getByRole`, `getByLabelText` を優先（`getByTestId` は最終手段）
- テストファイル配置: `__tests__/<ComponentName>.test.tsx`

### 実行コマンド

```bash
cd web && pnpm vitest run                    # 全テスト実行
cd web && pnpm vitest run <ファイル>          # 個別テスト実行
cd web && pnpm vitest run --coverage         # カバレッジ付き
cd web && pnpm eslint .                      # リント実行
```
