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
├── features/           # 機能モジュール（ドメイン単位）
│   └── <feature>/
│       ├── components/  # UI コンポーネント
│       ├── hooks/       # カスタムフック
│       ├── types/       # 型定義
│       ├── utils/       # ユーティリティ
│       └── __tests__/   # テスト
├── shared/             # 共有モジュール
│   ├── components/     # 共通UIコンポーネント
│   ├── hooks/          # 共通フック
│   ├── types/          # 共通型定義
│   └── utils/          # 共通ユーティリティ
├── app/                # アプリケーション設定
│   ├── routes/         # ルーティング
│   └── providers/      # プロバイダー
└── test/               # テスト設定
    └── setup.ts
```

### 依存方向の制約

- `features/A` → `features/B` の直接参照禁止
- `features/*` → `shared/*` は許可
- `shared/*` → `features/*` は禁止
- `app/` → `features/*`, `shared/*` は許可

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
