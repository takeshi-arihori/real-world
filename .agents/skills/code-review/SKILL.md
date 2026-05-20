---
name: code-review
description: >
  コードレビュー専用スキル。PRレビュー、差分レビュー、実装レビュー、テスト妥当性レビュー、
  アーキテクチャレビュー、API/CRUD設計レビューを依頼されたときに使用する。
  「レビューして」「PRレビューして」「テストが正しいか見て」「アーキテクチャを見て」
  「設計上問題ないか確認して」などがトリガー。
---

# Code Review

実装量よりも、学習目的に対して正しく設計・検証できているかを重視してレビューする。

## レビュー手順

1. 差分、関連 Issue、仕様、既存設計を確認する。
2. AI ハーネス正本として `docs/ai/harness.md` を読む。
3. `docs/rules/security.md` を必ず読む。
4. 変更範囲に応じて `docs/rules/frontend.md`、`docs/rules/backend.md`、`docs/rules/db.md` を読む。
   - Frontend 変更では `docs/rules/frontend.md` の React 設計原則を確認し、必要に応じて React 公式 `Thinking in React`（https://react.dev/learn/thinking-in-react）を参照する。
5. テスト、アーキテクチャ、API/CRUD設計、セキュリティ、保守性の順に確認する。
6. 実行系の検証が必要な場合は `verify-qa` skill を併用する。

## 重点観点

- テストが仕様を検証しているか。実装詳細だけを固定していないか。
- 正常系だけでなく、異常系、境界値、認可、バリデーション、永続化失敗を扱っているか。
- Frontend は Testing Library のユーザー視点クエリを使い、UIの責務と状態管理が分離されているか。
- Backend は Feature テストで HTTP 契約、Unit テストで Domain/Application の業務ルールを検証しているか。
- API/CRUD はリクエスト/レスポンス、ステータスコード、バリデーション、認可、ページングや並び順が一貫しているか。
- Laravel は Controller を薄く保ち、FormRequest、Domain/Application/Infrastructure/Presentation の責務を混ぜていないか。
- React は `app/`、`features/`、`shared/`、`lib/` の境界、Hooks と Component の責務を崩していないか。
- React component は関心の分離と単一責任を守り、component hierarchy、最小 state、state 所有者、一方向データフローが妥当か。
- `.env` 編集、シークレット直書き、危険な動的実行、SQL 文字列結合、サーバーサイド検証の省略がないか。

## 出力形式

レビュー結果は findings を先に出す。重大度順に並べ、各項目にファイル/行、問題、理由、修正方向、必要なテストを含める。

```
## Findings

- [High] path/to/file:123
  問題:
  理由:
  修正方向:
  追加・修正すべきテスト:

## Open Questions

- 必要な確認事項があれば記載する。

## Summary

- 問題がない場合は「重大な指摘はありません」と明記し、残るリスクや未実行テストを短く書く。
```

問題がない場合も、テスト観点とアーキテクチャ観点で確認した範囲を明記する。
