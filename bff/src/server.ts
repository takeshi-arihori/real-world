import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';

import { createAdaptorServer } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createClient } from 'redis';

const DEFAULT_PORT = 3006;
const DEFAULT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_SESSION_COOKIE_NAME = '__Host-conduit_session';
const DEFAULT_SESSION_KEY_PREFIX = 'bff:session:';
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60;
const CSRF_HEADER_NAME = 'x-csrf-token';

const BLOCKED_PUBLIC_IDENTITY_PATHS = new Set([
  '/api/user',
  '/api/users',
  '/api/users/login',
]);
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'authorization',
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  CSRF_HEADER_NAME,
]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'set-cookie',
  'transfer-encoding',
]);
const MUTATING_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

interface BffServerOptions {
  env?: NodeJS.ProcessEnv;
  port?: number | string;
  publicApiBaseUrl?: string | URL;
  redisClient?: RedisSessionClient;
  redisUrl?: string;
  sessionCookieName?: string;
  sessionKeyPrefix?: string;
  sessionStore?: BrowserSessionStore;
  sessionTtlSeconds?: number | string;
}

interface BffConfig {
  port: number;
  publicApiBaseUrl: URL;
  redisUrl: string;
  sessionCookieName: string;
  sessionKeyPrefix: string;
  sessionTtlSeconds: number;
}

export interface BrowserSession {
  csrfToken: string;
  expiresAt: number;
  id: string;
  publicJwt: string | null;
}

export interface BrowserSessionStore {
  createPreSession: () => Promise<BrowserSession>;
  destroy: (sessionId: string | null) => Promise<void>;
  get: (sessionId: string | null) => Promise<BrowserSession | null>;
  startAuthenticatedSession: (
    previousSession: BrowserSession,
    publicJwt: string,
  ) => Promise<BrowserSession>;
}

interface RedisSessionPayload {
  csrfToken: string;
  publicJwt: string | null;
}

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

interface RequestSession {
  session: BrowserSession | null;
  sessionId: string | null;
}

interface PublicApiForwardOptions {
  publicJwt: string | null;
  request: Request;
  targetPath: string;
}

/**
 * BrowserSession、CSRF、Public API forwarding を扱う Hono app を Node HTTP server として生成する。
 */
export async function createBffServer(options: BffServerOptions = {}): Promise<Server> {
  const app = await createBffApp(options);

  return createAdaptorServer({ fetch: app.fetch }) as Server;
}

async function createBffApp(options: BffServerOptions = {}): Promise<Hono> {
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

export function createMemorySessionStore(ttlSeconds: number): BrowserSessionStore {
  return new MemorySessionStore(ttlSeconds);
}

class MemorySessionStore implements BrowserSessionStore {
  private readonly sessions = new Map<string, BrowserSession>();

  private readonly ttlMilliseconds: number;

  public constructor(ttlSeconds: number) {
    this.ttlMilliseconds = ttlSeconds * 1000;
  }

  public async createPreSession(): Promise<BrowserSession> {
    return this.persist({
      csrfToken: randomOpaqueValue(),
      expiresAt: 0,
      id: randomOpaqueValue(),
      publicJwt: null,
    });
  }

  public async destroy(sessionId: string | null): Promise<void> {
    if (sessionId !== null) {
      this.sessions.delete(sessionId);
    }
  }

  public async get(sessionId: string | null): Promise<BrowserSession | null> {
    if (sessionId === null) {
      return null;
    }

    const session = this.sessions.get(sessionId) ?? null;

    if (session === null) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  public async startAuthenticatedSession(
    previousSession: BrowserSession,
    publicJwt: string,
  ): Promise<BrowserSession> {
    await this.destroy(previousSession.id);

    return this.persist({
      csrfToken: previousSession.csrfToken,
      expiresAt: 0,
      id: randomOpaqueValue(),
      publicJwt,
    });
  }

  private persist(session: BrowserSession): BrowserSession {
    const persisted = {
      ...session,
      expiresAt: Date.now() + this.ttlMilliseconds,
    };

    this.sessions.set(persisted.id, persisted);

    return persisted;
  }
}

export async function createRedisSessionStore(
  options: RedisSessionStoreOptions,
): Promise<BrowserSessionStore> {
  const client = options.client ?? createDefaultRedisClient(options.redisUrl ?? DEFAULT_REDIS_URL);

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

async function forwardRequestToPublicApi(
  config: BffConfig,
  options: PublicApiForwardOptions,
): Promise<Response> {
  const targetUrl = new URL(options.targetPath, config.publicApiBaseUrl);
  const init: RequestInit = {
    headers: createForwardHeaders(options.request.headers, options.publicJwt),
    method: options.request.method,
    redirect: 'manual',
  };

  if (options.request.method !== 'GET' && options.request.method !== 'HEAD') {
    const body = Buffer.from(await options.request.arrayBuffer());

    if (body.length > 0) {
      init.body = body;
    }
  }

  return fetch(targetUrl, init);
}

function createForwardHeaders(incomingHeaders: Headers, publicJwt: string | null): Headers {
  const headers = new Headers();

  incomingHeaders.forEach((value, name) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });

  if (publicJwt !== null) {
    headers.set('Authorization', `Token ${publicJwt}`);
  }

  return headers;
}

async function upstreamResponseToBrowserResponse(
  upstreamResponse: Response,
  context?: Context,
): Promise<Response> {
  const headers = new Headers();

  upstreamResponse.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });

  if (context !== undefined) {
    const outgoingSetCookie = context.res.headers.get('set-cookie');

    if (outgoingSetCookie !== null) {
      headers.set('Set-Cookie', outgoingSetCookie);
    }
  }

  return new Response(await upstreamResponse.arrayBuffer(), {
    headers,
    status: upstreamResponse.status,
  });
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

function hasValidCsrf(context: Context, session: BrowserSession | null): boolean {
  if (session === null) {
    return false;
  }

  return context.req.header(CSRF_HEADER_NAME) === session.csrfToken;
}

function isMutatingMethod(request: Request): boolean {
  return MUTATING_METHODS.has(request.method);
}

function isBlockedPublicIdentityPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '');

  return BLOCKED_PUBLIC_IDENTITY_PATHS.has(normalizedPathname);
}

function setSessionCookie(context: Context, config: BffConfig, sessionId: string): void {
  setCookie(context, config.sessionCookieName, sessionId, {
    httpOnly: true,
    maxAge: config.sessionTtlSeconds,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}

function expireSessionCookie(context: Context, config: BffConfig): void {
  setCookie(context, config.sessionCookieName, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

function csrfMismatchResponse(): Response {
  return jsonResponse(419, { errors: { body: ['CSRF token mismatch'] } });
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text === '') {
    return {};
  }

  return JSON.parse(text) as unknown;
}

function extractPublicJwt(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }

  const user = body.user;

  if (!isRecord(user) || typeof user.token !== 'string' || user.token === '') {
    return null;
  }

  return user.token;
}

function stripUserToken(body: unknown): unknown {
  if (!isRecord(body) || !isRecord(body.user)) {
    return body;
  }

  const userWithoutToken = { ...body.user };

  delete userWithoutToken.token;

  return {
    ...body,
    user: userWithoutToken,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function randomOpaqueValue(): string {
  return randomBytes(32).toString('base64url');
}

async function resolveSessionStore(
  config: BffConfig,
  options: BffServerOptions,
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

function resolveConfig(options: BffServerOptions): BffConfig {
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = resolveConfig({});
  const server = await createBffServer();

  server.listen(config.port, '0.0.0.0');
}
