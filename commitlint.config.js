/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 日本語・英語どちらも許可（大文字小文字チェック無効）
    "subject-case": [0],
    // ヘッダー最大長（日本語考慮で長めに設定）
    "header-max-length": [2, "always", 100],
    // 許可するコミットタイプ（git-flow.md に準拠）
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "test",
        "docs",
        "chore",
        "ci",
        "release",
        "revert",
      ],
    ],
  },
};

export default config;
