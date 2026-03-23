# ADR-002: React 19 + Vite 8 の採用

## ステータス

承認済み

## コンテキスト

フロントエンドのUIフレームワークとビルドツールを選定する必要があった。

## 決定

React 19 + TypeScript 5.9 + Vite 8 の組み合わせを採用する。

## 理由

- **React 19**: 最新の安定版。Server Components、Actions、新しいフック（`use`, `useOptimistic`, `useFormStatus`）など、モダンなパターンを活用可能
- **TypeScript 5.9**: 型安全性の向上。`satisfies` 演算子、decorators など新機能を活用可能
- **Vite 8**: 高速なHMR、ESModules ベースの開発サーバー、シンプルな設定

### 代替案

- **Next.js**: SSR/SSGが不要な場合はオーバースペック。LaravelをAPIサーバーとして使う構成ではSPAが適切
- **Vue 3**: Composition APIでReactと同等の表現力があるが、チームのReact経験を優先

## 影響

- SPAとして構築するため、SEOが必要な場合は別途対応が必要
- React 19の新機能（Server Components等）はSPA構成では一部利用不可
- Vitest をテストランナーとして採用（Viteとの親和性が高い）
