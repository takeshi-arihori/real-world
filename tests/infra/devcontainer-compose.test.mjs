import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const devcontainerCompose = readFileSync(
  new URL('../../.devcontainer/docker-compose.yml', import.meta.url),
  'utf8',
);
const rootCompose = readFileSync(
  new URL('../../compose.yml', import.meta.url),
  'utf8',
);
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const rootPackage = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

test('Dev Container isolates root and frontend node_modules from the host bind mount', () => {
  assertVolumeMount(
    devcontainerCompose,
    'devcontainer-root-node-modules',
    '/workspace/node_modules',
  );
  assertVolumeMount(
    devcontainerCompose,
    'devcontainer-frontend-node-modules',
    '/workspace/frontend/node_modules',
  );
  assertTopLevelVolume(devcontainerCompose, 'devcontainer-root-node-modules');
  assertTopLevelVolume(devcontainerCompose, 'devcontainer-frontend-node-modules');
});

test('frontend service keeps its existing /app/node_modules named volume', () => {
  assertVolumeMount(rootCompose, 'frontend-node-modules', '/app/node_modules');
  assertTopLevelVolume(rootCompose, 'frontend-node-modules');
});

test('README documents the Dev Container frontend test command', () => {
  assert.match(readme, /Dev Container/);
  assert.match(readme, /cd \/workspace\/frontend && pnpm install && pnpm test/);
});

test('root package exposes the infra configuration test', () => {
  assert.equal(rootPackage.scripts['test:infra'], 'node --test tests/infra/*.test.mjs');
});

function assertVolumeMount(composeFile, volumeName, mountPath) {
  assert.match(
    composeFile,
    new RegExp(`-\\s+${escapeRegExp(volumeName)}:${escapeRegExp(mountPath)}(?:\\s|$)`),
    `${volumeName} must be mounted at ${mountPath}`,
  );
}

function assertTopLevelVolume(composeFile, volumeName) {
  assert.match(
    composeFile,
    new RegExp(`^  ${escapeRegExp(volumeName)}:\\s*$`, 'm'),
    `${volumeName} must be declared in top-level volumes`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
