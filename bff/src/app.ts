import { Hono, type Context } from 'hono';
import { getCookie } from 'hono/cookie';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  type BffConfig,
  type BffConfigOptions,
  resolveConfig,
} from './config.js';
import { expireSessionCookie, setSessionCookie } from './http/cookies.js';
import { hasValidCsrf } from './http/csrf.js';
import {
  csrfMismatchResponse,
  jsonResponse,
  readJsonResponse,
} from './http/responses.js';
import {
  extractPublicJwt,
  forwardRequestToPublicApi,
  isBlockedPublicIdentityPath,
  stripUserToken,
  upstreamResponseToBrowserResponse,
} from './public-api/public-api-client.js';
import type { BrowserSession, BrowserSessionStore } from './session/browser-session.js';
import {
  createRedisSessionStore,
  type RedisSessionClient,
} from './session/redis-session-store.js';

const MUTATING_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

export interface BffAppOptions extends BffConfigOptions {
  redisClient?: RedisSessionClient;
  sessionStore?: BrowserSessionStore;
}

interface RequestSession {
  session: BrowserSession | null;
  sessionId: string | null;
}

export async function createBffApp(options: BffAppOptions = {}): Promise<Hono> {
  const config = resolveConfig(options);
  const sessions = await resolveSessionStore(config, options);
  const app = new Hono();

  app.onError(() => {
    return jsonResponse(500, { errors: { body: ['Internal Server Error'] } });
  });

  app.get('/health', (context) => {
    return context.json({ status: 'ok' });
  });

  app.get('/api/session/csrf', async (context) => {
    const existingSession = (await readRequestSession(context, config, sessions)).session;
    const session = existingSession ?? await sessions.createPreSession();

    setSessionCookie(context, config, session.id);

    return context.json({ csrfToken: session.csrfToken });
  });

  app.post('/api/session/register', async (context) => {
    return handleAuthSessionStart(context, config, sessions, '/api/users');
  });

  app.post('/api/session/login', async (context) => {
    return handleAuthSessionStart(context, config, sessions, '/api/users/login');
  });

  app.get('/api/session', async (context) => {
    return handleAuthenticatedSessionRequest(context, config, sessions, '/api/user');
  });

  app.put('/api/session/user', async (context) => {
    return handleAuthenticatedSessionRequest(context, config, sessions, '/api/user');
  });

  app.delete('/api/session', async (context) => {
    const { session, sessionId } = await readRequestSession(context, config, sessions);

    if (!hasValidCsrf(context, session)) {
      return csrfMismatchResponse();
    }

    await sessions.destroy(sessionId);
    expireSessionCookie(context, config);

    return context.body(null, 204);
  });

  app.all('/api/session', () => {
    return jsonResponse(404, { errors: { body: ['Not Found'] } });
  });

  app.all('/api/session/*', () => {
    return jsonResponse(404, { errors: { body: ['Not Found'] } });
  });

  app.all('/api/*', async (context) => {
    return handlePublicApiForwarding(context, config, sessions);
  });

  app.notFound(() => {
    return jsonResponse(404, { errors: { body: ['Not Found'] } });
  });

  return app;
}

async function handleAuthSessionStart(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
  publicPath: string,
): Promise<Response> {
  const { session } = await readRequestSession(context, config, sessions);

  if (!hasValidCsrf(context, session)) {
    return csrfMismatchResponse();
  }

  const upstreamResponse = await forwardRequestToPublicApi(config, {
    publicJwt: null,
    request: context.req.raw,
    targetPath: publicPath,
  });

  if (!upstreamResponse.ok) {
    return upstreamResponseToBrowserResponse(upstreamResponse);
  }

  const body = await readJsonResponse(upstreamResponse);
  const publicJwt = extractPublicJwt(body);

  if (publicJwt === null || session === null) {
    return jsonResponse(502, {
      errors: { body: ['Public API response did not include a token'] },
    });
  }

  const authenticatedSession = await sessions.startAuthenticatedSession(session, publicJwt);
  setSessionCookie(context, config, authenticatedSession.id);

  return context.json(stripUserToken(body), upstreamResponse.status as ContentfulStatusCode);
}

async function handleAuthenticatedSessionRequest(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
  publicPath: string,
): Promise<Response> {
  const { session, sessionId } = await readRequestSession(context, config, sessions);

  if (session?.publicJwt === null || session?.publicJwt === undefined) {
    return jsonResponse(401, { errors: { body: ['Unauthorized'] } });
  }

  if (isMutatingMethod(context.req.raw) && !hasValidCsrf(context, session)) {
    return csrfMismatchResponse();
  }

  const upstreamResponse = await forwardRequestToPublicApi(config, {
    publicJwt: session.publicJwt,
    request: context.req.raw,
    targetPath: publicPath,
  });

  if (upstreamResponse.status === 401) {
    await sessions.destroy(sessionId);
    expireSessionCookie(context, config);

    return upstreamResponseToBrowserResponse(upstreamResponse, context);
  }

  if (!upstreamResponse.ok) {
    return upstreamResponseToBrowserResponse(upstreamResponse);
  }

  const body = await readJsonResponse(upstreamResponse);

  return context.json(stripUserToken(body), upstreamResponse.status as ContentfulStatusCode);
}

async function handlePublicApiForwarding(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
): Promise<Response> {
  const requestUrl = new URL(context.req.url);

  if (isBlockedPublicIdentityPath(requestUrl.pathname)) {
    return jsonResponse(404, { errors: { body: ['Use the BFF session endpoints'] } });
  }

  const { session, sessionId } = await readRequestSession(context, config, sessions);

  if (isMutatingMethod(context.req.raw) && !hasValidCsrf(context, session)) {
    return csrfMismatchResponse();
  }

  const publicJwt = session?.publicJwt ?? null;
  const upstreamResponse = await forwardRequestToPublicApi(config, {
    publicJwt,
    request: context.req.raw,
    targetPath: `${requestUrl.pathname}${requestUrl.search}`,
  });

  if (upstreamResponse.status === 401 && publicJwt !== null) {
    await sessions.destroy(sessionId);
    expireSessionCookie(context, config);

    return upstreamResponseToBrowserResponse(upstreamResponse, context);
  }

  return upstreamResponseToBrowserResponse(upstreamResponse);
}

async function readRequestSession(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
): Promise<RequestSession> {
  const sessionId = getCookie(context, config.sessionCookieName) ?? null;

  return {
    session: await sessions.get(sessionId),
    sessionId,
  };
}

function isMutatingMethod(request: Request): boolean {
  return MUTATING_METHODS.has(request.method);
}

async function resolveSessionStore(
  config: BffConfig,
  options: BffAppOptions,
): Promise<BrowserSessionStore> {
  if (options.sessionStore !== undefined) {
    return options.sessionStore;
  }

  return createRedisSessionStore({
    client: options.redisClient,
    keyPrefix: config.sessionKeyPrefix,
    redisUrl: config.redisUrl,
    ttlSeconds: config.sessionTtlSeconds,
  });
}
