import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRedisSessionStore } from '../src/server.js';

interface StoredRedisValue {
  expiresAt: number;
  value: string;
}

interface RedisSetOptions {
  EX: number;
}

class FakeRedisClient {
  private readonly values = new Map<string, StoredRedisValue>();

  private now = 0;

  public connectCount = 0;

  public async connect(): Promise<void> {
    this.connectCount += 1;
  }

  public async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0;
  }

  public async get(key: string): Promise<string | null> {
    const stored = this.values.get(key);

    if (stored === undefined) {
      return null;
    }

    if (stored.expiresAt <= this.now) {
      this.values.delete(key);
      return null;
    }

    return stored.value;
  }

  public async ping(): Promise<string> {
    return 'PONG';
  }

  public async set(key: string, value: string, options: RedisSetOptions): Promise<string> {
    this.values.set(key, {
      expiresAt: this.now + options.EX * 1000,
      value,
    });

    return 'OK';
  }

  public async ttl(key: string): Promise<number> {
    const stored = await this.get(key);

    if (stored === null) {
      return -2;
    }

    const value = this.values.get(key);

    assert.notEqual(value, undefined);

    return Math.ceil((value.expiresAt - this.now) / 1000);
  }

  public advance(milliseconds: number): void {
    this.now += milliseconds;
  }
}

test('Redis-backed BrowserSessionStore は TTL と process restart 相当の共有 store を扱える', async () => {
  const redis = new FakeRedisClient();
  const store = await createRedisSessionStore({
    client: redis,
    keyPrefix: 'bff:test:',
    ttlSeconds: 60,
  });

  const preSession = await store.createPreSession();
  const authenticatedSession = await store.startAuthenticatedSession(preSession, 'public-jwt');
  const restartedStore = await createRedisSessionStore({
    client: redis,
    keyPrefix: 'bff:test:',
    ttlSeconds: 60,
  });

  assert.equal(await restartedStore.get(preSession.id), null);
  assert.equal((await restartedStore.get(authenticatedSession.id))?.publicJwt, 'public-jwt');
  assert.equal(await redis.ttl(`bff:test:${authenticatedSession.id}`), 60);

  redis.advance(60_000);

  assert.equal(await restartedStore.get(authenticatedSession.id), null);
});

test('Redis-backed BrowserSessionStore は destroy で Redis key を削除する', async () => {
  const redis = new FakeRedisClient();
  const store = await createRedisSessionStore({
    client: redis,
    keyPrefix: 'bff:test:',
    ttlSeconds: 60,
  });
  const session = await store.createPreSession();

  await store.destroy(session.id);

  assert.equal(await store.get(session.id), null);
  assert.equal(await redis.ttl(`bff:test:${session.id}`), -2);
});

test('Redis-backed BrowserSessionStore は Redis unavailable を fail-fast にする', async () => {
  const redis = {
    connect: async () => {
      throw new Error('connection refused');
    },
    del: async () => 0,
    get: async () => null,
    ping: async () => 'PONG',
    set: async () => 'OK',
    ttl: async () => -2,
  };

  await assert.rejects(
    createRedisSessionStore({
      client: redis,
      keyPrefix: 'bff:test:',
      ttlSeconds: 60,
    }),
    /Redis session store is unavailable/,
  );
});
