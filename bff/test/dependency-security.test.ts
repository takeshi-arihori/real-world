import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

interface PackageMetadata {
  name: string;
  version: string;
}

const MINIMUM_SAFE_VERSIONS = new Map([
  ['@hono/node-server', '1.19.15'],
  ['hono', '4.12.34'],
]);

test('BFF runtime dependency は既知advisoryの修正版下限以上を解決する', async () => {
  for (const [packageName, minimumVersion] of MINIMUM_SAFE_VERSIONS) {
    const metadata = await readPackageMetadata(packageName);

    assert.equal(metadata.name, packageName);
    assert.equal(
      isVersionAtLeast(metadata.version, minimumVersion),
      true,
      `${packageName} ${metadata.version} must be >= ${minimumVersion}`,
    );
  }
});

async function readPackageMetadata(packageName: string): Promise<PackageMetadata> {
  let directory = dirname(fileURLToPath(import.meta.resolve(packageName)));

  while (true) {
    const packageJsonPath = join(directory, 'package.json');

    try {
      const metadata: unknown = JSON.parse(await readFile(packageJsonPath, 'utf8'));

      if (isPackageMetadata(metadata) && metadata.name === packageName) {
        return metadata;
      }
    } catch (error: unknown) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error(`Unable to locate package metadata for ${packageName}`);
    }

    directory = parentDirectory;
  }
}

function isPackageMetadata(value: unknown): value is PackageMetadata {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'name' in value
    && typeof value.name === 'string'
    && 'version' in value
    && typeof value.version === 'string';
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && error.code === 'ENOENT';
}

function isVersionAtLeast(version: string, minimumVersion: string): boolean {
  const currentParts = parseVersion(version);
  const minimumParts = parseVersion(minimumVersion);

  for (const index of [0, 1, 2] as const) {
    const currentPart = currentParts[index];
    const minimumPart = minimumParts[index];

    if (currentPart !== minimumPart) {
      return currentPart > minimumPart;
    }
  }

  return true;
}

function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (match === null) {
    throw new Error(`Unsupported semantic version: ${version}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
