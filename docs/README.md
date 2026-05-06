# docs

このディレクトリは RealWorld プロジェクトの要件、設計、開発ルール、AI ハーネス運用の正本を置く場所です。
迷った場合は、入口ファイルや agent 固有ファイルではなく、この `docs/` 配下を更新します。

## 読み順

1. [`requirements.md`](requirements.md): MVP の要件、対象ユーザー、機能要件、非機能要件
2. [`ai/harness.md`](ai/harness.md): AI ハーネス設計、skill の責務、レビュー優先方針
3. [`rules/`](rules/): フロントエンド、バックエンド、DB、Git、ログ、セキュリティの開発ルール
4. [`context-map.md`](context-map.md): Bounded Context と Context 間の関係
5. [`arch/`](arch/): ドメイン設計の補足資料
6. [`../specs/_template-feature-spec.md`](../specs/_template-feature-spec.md): Issue 確定後の実装前設計メモテンプレート
7. [`labels.md`](labels.md): GitHub Issue / PR ラベル運用

## ディレクトリ構成

| パス | 役割 |
| --- | --- |
| `requirements.md` | MVP スコープと機能・非機能要件の正本 |
| `ai/` | AI ハーネス、skill 連携、レビュー方針 |
| `rules/` | 実装時に従うコーディング・運用ルール |
| `context-map.md` | DDD の Bounded Context、責務、Context 間連携 |
| `arch/` | ドメイン分割、コンテキスト間の関係、用語定義 |
| `db/` | DBML 形式のスキーマ記録 |
| `labels.md` | GitHub ラベルの分類と付与ルール |

GitHub Projects、Epic、sub-issue の運用は [`rules/project.md`](rules/project.md) を参照します。

## Issue 単位の設計メモ

Issue に着手するときは [`../specs/_template-feature-spec.md`](../specs/_template-feature-spec.md) を使い、作業用メモをリポジトリルートの `specs/` に作成します。
`specs/` はテンプレートだけを tracked にし、実際の作業メモは gitignored として PR には含めません。

Issue 作成時に GitHub UI で使うテンプレートは `.github/ISSUE_TEMPLATE/` に置きます。
このリポジトリでは、ドキュメント/要件/設計用、機能実装用、不具合修正用の Issue template を用意しています。

レビューや実装に必要な恒久的な判断は、作業メモではなく `requirements.md`、`rules/`、`arch/`、`ai/` のいずれかへ反映します。

## ADR の扱い

ADR はこのリポジトリでは廃止方向です。
アーキテクチャ判断を独立した ADR として残すのではなく、次の正本へ直接反映します。

- 要件やスコープ: `requirements.md`
- 実装ルール: `rules/`
- ドメイン設計: `arch/`
- AI ハーネス運用: `ai/harness.md`

判断理由を残す必要がある場合は、該当する正本内に短く理由を書きます。
