---
name: realworld-spec-check
description: >
  実装済みまたは変更中の機能が RealWorld / Conduit 仕様に沿っているかを、
  PR前またはレビュー時に部分的に確認するスキル。全機能の実装有無を網羅監査するのではなく、
  差分や指定された機能に関係する Backend API、Frontend routes/UI contract、DB設計、テスト、
  エラー形式、認証・認可を docs.realworld.show の公式仕様と突き合わせたいときに使用する。
  「RealWorld仕様チェック」「Conduit spec」「PR前に仕様確認」「API spec準拠確認」
  「公式仕様に沿ってるか見て」などがトリガー。
---

# RealWorld Spec Check

RealWorld / Conduit の公式仕様と、このリポジトリのルールを突き合わせて、実装済みまたは変更中の機能に限って仕様逸脱を見つける。

## Scope

- 差分、Issue、PR、またはユーザーが指定した機能だけを対象にする。
- RealWorld 全機能の未実装一覧は作らない。ユーザーが明示的に「全体の実装状況を棚卸しして」と依頼した場合だけ行う。
- 対象外機能の不足は、変更中の契約を壊す場合を除き findings にしない。

## Workflow

1. 変更範囲を確認する。
   - ユーザーが base commit / branch を指定した場合はそれを使う。
   - 指定がなければ `develop` との merge-base を基準に `git diff` と `git diff --stat` を確認する。
   - Issue / PR / branch 名から対象機能を推定し、レビュー対象外の機能を広げすぎない。
2. 必要なローカルルールを読む。
   - 常に `docs/ai/harness.md` と `docs/rules/security.md` を確認する。
   - `frontend/` 変更時は `docs/rules/frontend.md`、`backend/` 変更時は `docs/rules/backend.md`、DB/マイグレーション/DBML変更時は `docs/rules/db.md` を確認する。
3. `references/realworld-spec.md` を読む。
   - API endpoint、request/response envelope、認証、エラー形式、Frontend route、E2E selector contract のうち、差分または指定機能に関係する項目だけを重点確認する。
   - 仕様が変わっている可能性がある、またはユーザーが「最新」を求める場合は `https://docs.realworld.show/` とリンク先の OpenAPI / selector contract を確認する。
4. 仕様との対応をレビューする。
   - Backend 変更なら endpoint path/method、必須/任意フィールド、認証必須/任意、status code、JSON key、camelCase、権限、ページング、並び順を確認する。
   - Frontend 変更なら route、token保存、API呼び出し、画面状態、フォーム名、必須CSS class/text、エラー表示、権限に応じた表示を確認する。
   - DB変更なら内部実装として対象機能を支えられるかを確認し、外部APIへ内部IDや `password_hash` などを漏らしていないかを確認する。
   - テスト変更なら対象機能の正常系だけでなく、認証、認可、validation、境界値、RealWorld固有の返却形式を検証しているかを見る。
5. 必要なら `verify-qa` skill を併用する。
   - 型チェック、Feature/Unit test、lint、静的解析、audit がPR前の根拠になる場合に実行する。
   - 実行できないチェックがあれば、理由と残リスクを明記する。

## Review Priorities

重大度は、公式クライアントや公式テストとの互換性を壊すものを高く扱う。

- High: endpoint path/method/auth/response envelope/status code が仕様と違う、所有者以外が更新/削除できる、tokenや秘密情報を漏らす。
- Medium: pagination/default order/filter、`favorited` / `following` / `favoritesCount`、slug更新、article list body除外などの仕様差分。
- Low: READMEや補助ドキュメントの不足、テスト名や軽微な整理。ただしPRを止めるほどでなければ所感に留める。

## Output

レビューとして依頼された場合は findings を先に出し、重大度順に並べる。

```markdown
## Findings

- [High] path/to/file:123
  問題:
  仕様:
  修正方向:
  追加・修正すべきテスト:

## Spec Coverage

- 対象機能:
- 確認したRealWorld仕様:
- 対象外:
- 未確認/未実行:

## Summary

- 重大な指摘がない場合は「重大な仕様逸脱はありません」と明記する。
```

PR本文やチェックリスト作成を依頼された場合は、対象機能の仕様準拠、テスト済み項目、残リスク、対象外の4分類で短くまとめる。
