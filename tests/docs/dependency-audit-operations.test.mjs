import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const nonFunctionalRequirements = readFileSync(
  new URL('../../docs/non-functional-requirements.md', import.meta.url),
  'utf8',
);
const securityRules = readFileSync(
  new URL('../../docs/rules/security.md', import.meta.url),
  'utf8',
);

test('非機能要件にdependency auditの実行コマンドを記載している', () => {
  const auditSection = markdownSection(
    nonFunctionalRequirements,
    'Dependency Audit Operations',
    2,
  );

  assert.match(auditSection, /cd backend && composer audit/);
  assert.match(auditSection, /cd frontend && pnpm audit/);
  assert.match(auditSection, /cd bff && pnpm audit/);
});

test('dependency auditのtriage方針にレビュー入力と対応判断を記載している', () => {
  const auditSection = markdownSection(
    nonFunctionalRequirements,
    'Dependency Audit Operations',
    2,
  );

  for (const requiredTerm of [
    'severity',
    'advisory',
    'direct dependency',
    'transitive dependency',
    'runtime dependency',
    'dev dependency',
    'exploitability',
    'remediation',
  ]) {
    assert.match(auditSection, new RegExp(escapeRegExp(requiredTerm), 'i'));
  }
});

test('dependency policyにPR記載内容とmajor updateと一時例外を含めている', () => {
  const auditSection = markdownSection(
    nonFunctionalRequirements,
    'Dependency Audit Operations',
    2,
  );

  for (const requiredTerm of [
    'new dependency',
    'reason',
    'manifest',
    'lockfile',
    'major update',
    'migration',
    'temporary exception',
    'expiry',
    're-evaluation',
  ]) {
    assert.match(auditSection, new RegExp(escapeRegExp(requiredTerm), 'i'));
  }

  assert.match(auditSection, /\.env/);
  assert.match(auditSection, /secret/i);
});

test('セキュリティルールからdependency policyの正本を参照できる', () => {
  const dependencySection = markdownSection(securityRules, '依存ライブラリ管理', 2);

  assert.match(dependencySection, /composer audit/);
  assert.match(dependencySection, /pnpm audit/);
  assert.match(dependencySection, /docs\/non-functional-requirements\.md/);
});

function markdownSection(markdown, heading, level) {
  const hashes = '#'.repeat(level);
  const sectionStart = markdown.indexOf(`${hashes} ${heading}\n`);

  assert.notEqual(sectionStart, -1, `${hashes} ${heading} セクションがありません`);

  const bodyStart = sectionStart + `${hashes} ${heading}\n`.length;
  const remaining = markdown.slice(bodyStart);
  const nextHeading = new RegExp(`\\n#{1,${level}} `);
  const nextHeadingMatch = remaining.match(nextHeading);

  return nextHeadingMatch === null
    ? remaining
    : remaining.slice(0, nextHeadingMatch.index);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
