# Frontend

React 19 + TypeScript + Vite ベースの frontend アプリケーションです。実装前にルートの `README.md` と `CLAUDE.md` を確認してください。

## 参照先

- ルール: `../docs/rules/frontend.md`
- セキュリティ: `../docs/rules/security.md`
- ドメイン設計: `../docs/arch/`
- Issue単位の設計メモ: `../specs/`（gitignored）

## よく使うコマンド

```bash
cd frontend && pnpm install
cd frontend && pnpm tsc -b --noEmit
cd frontend && pnpm vitest run
cd frontend && pnpm eslint .
```
