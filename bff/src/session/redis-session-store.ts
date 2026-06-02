import { createClient } from 'redis';

import {
  type BrowserSession,
  type BrowserSessionStore,
  randomOpaqueValue,
} from './browser-session.js';

export interface RedisSetOptions {
  EX: number;
}

export interface RedisSessionClient {
  connect?: () => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  ping?: () => Promise<unknown>;
  set: (key: string, value: string, options: RedisSetOptions) => Promise<unknown>;
  ttl: (key: string) => Promise<number>;
}

export interface RedisSessionStoreOptions {
  client?: RedisSessionClient;
  keyPrefix: string;
  redisUrl?: string;
  ttlSeconds: number;
}

interface RedisSessionPayload {
  csrfToken: string;
  publicJwt: string | null;
}

export async function createRedisSessionStore(
  options: RedisSessionStoreOptions,
): Promise<BrowserSessionStore> {
  const client = options.client ?? createDefaultRedisClient(options.redisUrl ?? 'redis://localhost:6379');

  try {
    await client.connect?.();
    await client.ping?.();
  } catch (cause) {
    throw new Error('Redis session store is unavailable', { cause });
  }

  return new RedisSessionStore(client, options.keyPrefix, options.ttlSeconds);
}

class RedisSessionStore implements BrowserSessionStore {
  public constructor(
    private readonly client: RedisSessionClient,
    private readonly keyPrefix: string,
    private readonly ttlSeconds: number,
  ) {}

  public async createPreSession(): Promise<BrowserSession> {
    return this.persist({
      csrfToken: randomOpaqueValue(),
      id: randomOpaqueValue(),
      publicJwt: null,
    });
  }

  public async destroy(sessionId: string | null): Promise<void> {
    if (sessionId !== null) {
      await this.client.del(this.sessionKey(sessionId));
    }
  }

  public async get(sessionId: string | null): Promise<BrowserSession | null> {
    if (sessionId === null) {
      return null;
    }

    const key = this.sessionKey(sessionId);
    const serializedPayload = await this.client.get(key);

    if (serializedPayload === null) {
      return null;
    }

    const payload = parseRedisSessionPayload(serializedPayload);

    if (payload === null) {
      await this.destroy(sessionId);
      return null;
    }

    const remainingTtlSeconds = await this.client.ttl(key);

    if (remainingTtlSeconds <= 0) {
      await this.destroy(sessionId);
      return null;
    }

    return {
      csrfToken: payload.csrfToken,
      expiresAt: Date.now() + remainingTtlSeconds * 1000,
      id: sessionId,
      publicJwt: payload.publicJwt,
    };
  }

  public async startAuthenticatedSession(
    previousSession: BrowserSession,
    publicJwt: string,
  ): Promise<BrowserSession> {
    await this.destroy(previousSession.id);

    return this.persist({
      csrfToken: previousSession.csrfToken,
      id: randomOpaqueValue(),
      publicJwt,
    });
  }

  private async persist(session: Omit<BrowserSession, 'expiresAt'>): Promise<BrowserSession> {
    await this.client.set(this.sessionKey(session.id), serializeRedisSessionPayload(session), {
      EX: this.ttlSeconds,
    });

    return {
      ...session,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    };
  }

  private sessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }
}

function createDefaultRedisClient(redisUrl: string): RedisSessionClient {
  const client = createClient({ url: redisUrl });

  client.on('error', () => undefined);

  return client as unknown as RedisSessionClient;
}

function serializeRedisSessionPayload(session: Omit<BrowserSession, 'expiresAt'>): string {
  return JSON.stringify({
    csrfToken: session.csrfToken,
    publicJwt: session.publicJwt,
  } satisfies RedisSessionPayload);
}

function parseRedisSessionPayload(serializedPayload: string): RedisSessionPayload | null {
  try {
    const payload = JSON.parse(serializedPayload) as unknown;

    if (
      !isRecord(payload)
      || typeof payload.csrfToken !== 'string'
      || payload.csrfToken === ''
      || (payload.publicJwt !== null && typeof payload.publicJwt !== 'string')
    ) {
      return null;
    }

    return {
      csrfToken: payload.csrfToken,
      publicJwt: payload.publicJwt,
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
