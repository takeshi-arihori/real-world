import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const nonFunctionalRequirements = readFileSync(
  new URL('../../docs/non-functional-requirements.md', import.meta.url),
  'utf8',
);
const rootPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);
const frontendPackage = JSON.parse(
  readFileSync(new URL('../../frontend/package.json', import.meta.url), 'utf8'),
);
const bffPackage = JSON.parse(
  readFileSync(new URL('../../bff/package.json', import.meta.url), 'utf8'),
);

test('README has copy-pasteable first-run Docker setup commands', () => {
  for (const command of [
    'docker compose up -d',
    'docker compose exec backend-php composer install',
    'cp backend/.env.example backend/.env',
    'perl -0pi -e',
    'docker compose exec backend-php php artisan key:generate',
    'docker compose exec backend-php php artisan migrate',
    'docker compose exec frontend pnpm install',
    'docker compose down',
  ]) {
    assert.match(readme, new RegExp(escapeRegExp(command)));
  }

  assert.match(readme, /JWT_SECRET=.*random_bytes\(32\)/);
  assert.doesNotMatch(readme, /docker compose exec backend-php bash/);
  assert.doesNotMatch(readme, /docker compose exec frontend sh/);
});

test('README documents implemented Docker services and ports', () => {
  for (const service of [
    ['frontend', '3005'],
    ['BFF', '3006'],
    ['backend-nginx', '8080'],
    ['db', '3309'],
    ['redis', '6379'],
    ['mailpit', '8025'],
    ['mailpit', '1025'],
  ]) {
    const [name, port] = service;

    assert.match(readme, new RegExp(`${escapeRegExp(name)}[\\s\\S]*${port}`, 'i'));
  }
});

test('README verification commands match package scripts and backend Docker execution', () => {
  assert.equal(rootPackage.scripts['test:docs'], 'node --test tests/docs/*.test.mjs');
  assert.equal(rootPackage.scripts['test:infra'], 'node --test tests/infra/*.test.mjs');
  assert.equal(frontendPackage.scripts.test, 'vitest run');
  assert.equal(frontendPackage.scripts.lint, 'eslint .');
  assert.equal(bffPackage.scripts.test, 'node --import tsx --test "test/**/*.test.ts"');
  assert.equal(bffPackage.scripts['type-check'], 'tsc -p tsconfig.json --noEmit');
  assert.equal(bffPackage.scripts.lint, 'eslint .');

  for (const command of [
    'pnpm test:docs',
    'pnpm test:infra',
    'pnpm -C frontend tsc -b --noEmit',
    'pnpm -C frontend vitest run',
    'pnpm -C frontend eslint .',
    'pnpm -C bff type-check',
    'pnpm -C bff test',
    'pnpm -C bff lint',
    'docker compose exec backend-php php artisan test',
    'docker compose exec backend-php ./vendor/bin/pint --test',
    'docker compose exec backend-php ./vendor/bin/phpstan analyse',
    'git diff --check',
  ]) {
    assert.match(readme, new RegExp(escapeRegExp(command)));
  }
});

test('README keeps BFF setup caveats and docs links visible', () => {
  for (const requiredText of [
    'same-origin',
    'BFF_PROXY_TARGET',
    'VITE_API_BASE_URL',
    'Public API/backend-nginx',
    '[Docs Guide](docs/README.md)',
    '[非機能要件](docs/non-functional-requirements.md)',
    '[コーディングルール](docs/rules/)',
  ]) {
    assert.match(readme, new RegExp(escapeRegExp(requiredText)));
  }
});

test('non-functional requirements list the current Docker support services', () => {
  const localReproducibility = markdownSection(
    nonFunctionalRequirements,
    'Local Reproducibility',
    2,
  );

  for (const service of ['bff', 'redis', 'backend-nginx', 'backend-php', 'frontend']) {
    assert.match(localReproducibility, new RegExp(escapeRegExp(service)));
  }
});

function markdownSection(markdown, heading, level) {
  const hashes = '#'.repeat(level);
  const sectionStart = markdown.indexOf(`${hashes} ${heading}\n`);

  assert.notEqual(sectionStart, -1, `${hashes} ${heading} section is missing`);

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
