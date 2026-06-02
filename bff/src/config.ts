const DEFAULT_PORT = 3006;
const DEFAULT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_SESSION_COOKIE_NAME = '__Host-conduit_session';
const DEFAULT_SESSION_KEY_PREFIX = 'bff:session:';
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60;

export const CSRF_HEADER_NAME = 'x-csrf-token';

export interface BffConfigOptions {
  env?: NodeJS.ProcessEnv;
  port?: number | string;
  publicApiBaseUrl?: string | URL;
  redisUrl?: string;
  sessionCookieName?: string;
  sessionKeyPrefix?: string;
  sessionTtlSeconds?: number | string;
}

export interface BffConfig {
  port: number;
  publicApiBaseUrl: URL;
  redisUrl: string;
  sessionCookieName: string;
  sessionKeyPrefix: string;
  sessionTtlSeconds: number;
}

export function resolveConfig(options: BffConfigOptions = {}): BffConfig {
  // テストでは options を優先し、通常起動では環境変数から BFF 境界の設定を読む。
  const env = options.env ?? process.env;
  const port = readPositiveInteger(options.port ?? env.PORT, DEFAULT_PORT);
  const sessionTtlSeconds = readPositiveInteger(
    options.sessionTtlSeconds ?? env.BFF_SESSION_TTL_SECONDS,
    DEFAULT_SESSION_TTL_SECONDS,
  );
  const publicApiBaseUrl = options.publicApiBaseUrl
    ?? env.PUBLIC_API_BASE_URL
    ?? DEFAULT_PUBLIC_API_BASE_URL;
  const redisUrl = options.redisUrl
    ?? env.BFF_REDIS_URL
    ?? DEFAULT_REDIS_URL;
  const sessionCookieName = options.sessionCookieName
    ?? env.BFF_SESSION_COOKIE_NAME
    ?? DEFAULT_SESSION_COOKIE_NAME;
  const sessionKeyPrefix = readNonEmptyString(
    options.sessionKeyPrefix ?? env.BFF_SESSION_KEY_PREFIX,
    DEFAULT_SESSION_KEY_PREFIX,
  );

  return {
    port,
    publicApiBaseUrl: new URL(publicApiBaseUrl),
    redisUrl,
    sessionCookieName,
    sessionKeyPrefix,
    sessionTtlSeconds,
  };
}

function readPositiveInteger(value: number | string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Expected a positive integer configuration value');
  }

  return parsed;
}

function readNonEmptyString(value: string | undefined, defaultValue: string): string {
  if (value === undefined) {
    return defaultValue;
  }

  if (value === '') {
    throw new Error('Expected a non-empty configuration value');
  }

  return value;
}
