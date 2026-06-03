import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';

import { createAdaptorServer } from '@hono/node-server';

import { createBffApp, type BffAppOptions } from './app.js';
import { resolveConfig } from './config.js';

export type { BrowserSession, BrowserSessionStore } from './session/browser-session.js';
export { createMemorySessionStore } from './session/memory-session-store.js';
export {
  createRedisSessionStore,
  type RedisSessionClient,
  type RedisSessionStoreOptions,
} from './session/redis-session-store.js';

/**
 * Hono app を Node HTTP server として生成する。
 */
export async function createBffServer(options: BffAppOptions = {}): Promise<Server> {
  const app = await createBffApp(options);

  return createAdaptorServer({ fetch: app.fetch }) as Server;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = resolveConfig({});
  const server = await createBffServer();

  server.listen(config.port, '0.0.0.0');
}
