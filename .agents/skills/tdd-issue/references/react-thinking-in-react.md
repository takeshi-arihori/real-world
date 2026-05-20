# React Thinking in React Reference

> 確認日: 2026-05-20
> 参照元URL: https://react.dev/learn/thinking-in-react

この reference は、フロントエンド設計・Plan 時に React 公式 "Thinking in React" の考え方をローカルで参照するための要点メモ。
URL先を毎回読ませるのではなく、設計判断に必要な最小限の観点をここに固定する。

## 設計手順

1. UI を component hierarchy に分解する。
2. props だけで静的に描画できる構造を先に考える。
3. UI state の最小集合を特定する。
4. 各 state の所有者を決める。
5. 一方向データフローで component をつなぐ。

## Component 分解

- component は原則として1つの関心だけを持つ。
- component が複数の責務を持ち始めたら、subcomponent、custom hook、utility へ分解する。
- UI の情報構造と data model の構造が対応するように component 境界を切る。
- デザイン上のまとまり、CSS selector の単位、関数分割と同じ判断軸で component 粒度を確認する。

## State 設計

state にするのは、時間で変化し、props や既存 state から計算できない最小集合だけにする。

state にしないもの:

- props として渡されるデータ
- 時間で変化しない定数
- 既存 state / props から計算できる derived data

derived data の例:

- filter 済み一覧
- 件数
- 表示用ラベル
- sort / filter 条件から再計算できる表示結果

## State 所有者

state を使うすべての component を確認し、その最も近い共通親へ state を置く。
共通親に置くと責務が曖昧になる場合は、state 保持専用の component / Provider / hook を作る。

## レビュー観点

- component hierarchy が画面・data model の構造に合っているか。
- component が表示、hook が状態・副作用、api 層が通信、lib が技術基盤に分かれているか。
- state が最小集合か。
- derived data を state として重複保持していないか。
- state 所有者が近すぎず遠すぎないか。
- props が親から子へ一方向に流れているか。
