import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRedisSessionStore } from '../src/server.js';
import { FakeRedisClient } from './support/fake-redis-client.js';

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
