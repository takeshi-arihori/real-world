import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';

import { createAdaptorServer } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const DEFAULT_PORT = 3006;
const DEFAULT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const DEFAULT_SESSION_COOKIE_NAME = '__Host-conduit_session';
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
  sessionCookieName?: string;
  sessionStore?: BrowserSessionStore;
  sessionTtlSeconds?: number | string;
}

interface BffConfig {
  port: number;
  publicApiBaseUrl: URL;
  sessionCookieName: string;
  sessionTtlSeconds: number;
}

interface BrowserSession {
  csrfToken: string;
  expiresAt: number;
  id: string;
  publicJwt: string | null;
}

interface BrowserSessionStore {
  createPreSession: () => BrowserSession;
  destroy: (sessionId: string | null) => void;
  get: (sessionId: string | null) => BrowserSession | null;
  startAuthenticatedSession: (
    previousSession: BrowserSession,
    publicJwt: string,
  ) => BrowserSession;
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
export function createBffServer(options: BffServerOptions = {}): Server {
  const app = createBffApp(options);

  return createAdaptorServer({ fetch: app.fetch }) as Server;
}

function createBffApp(options: BffServerOptions = {}): Hono {
  const config = resolveConfig(options);
  const sessions = options.sessionStore ?? new MemorySessionStore(config.sessionTtlSeconds);
  const app = new Hono();

  app.onError(() => {
    return jsonResponse(500, { errors: { body: ['Internal Server Error'] } });
  });

  app.get('/health', (context) => {
    return context.json({ status: 'ok' });
  });

  app.get('/api/session/csrf', (context) => {
    const existingSession = readRequestSession(context, config, sessions).session;
    const session = existingSession ?? sessions.createPreSession();

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

  app.delete('/api/session', (context) => {
    const { session, sessionId } = readRequestSession(context, config, sessions);

    if (!hasValidCsrf(context, session)) {
      return csrfMismatchResponse();
    }

    sessions.destroy(sessionId);
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

// TODO: 本番運用や複数 instance 構成では Redis などの共有 store に置き換える。
// TODO: 長時間起動する場合は定期 cleanup または session 数の上限を追加する。
class MemorySessionStore implements BrowserSessionStore {
  private readonly sessions = new Map<string, BrowserSession>();

  private readonly ttlMilliseconds: number;

  public constructor(ttlSeconds: number) {
    this.ttlMilliseconds = ttlSeconds * 1000;
  }

  public createPreSession(): BrowserSession {
    return this.persist({
      csrfToken: randomOpaqueValue(),
      expiresAt: 0,
      id: randomOpaqueValue(),
      publicJwt: null,
    });
  }

  public destroy(sessionId: string | null): void {
    if (sessionId !== null) {
      this.sessions.delete(sessionId);
    }
  }

  public get(sessionId: string | null): BrowserSession | null {
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

  public startAuthenticatedSession(
    previousSession: BrowserSession,
    publicJwt: string,
  ): BrowserSession {
    this.destroy(previousSession.id);

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

async function handleAuthSessionStart(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
  publicPath: string,
): Promise<Response> {
  const { session } = readRequestSession(context, config, sessions);

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

  const authenticatedSession = sessions.startAuthenticatedSession(session, publicJwt);
  setSessionCookie(context, config, authenticatedSession.id);

  return context.json(stripUserToken(body), upstreamResponse.status as ContentfulStatusCode);
}

async function handleAuthenticatedSessionRequest(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
  publicPath: string,
): Promise<Response> {
  const { session, sessionId } = readRequestSession(context, config, sessions);

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
    sessions.destroy(sessionId);
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

  const { session, sessionId } = readRequestSession(context, config, sessions);

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
    sessions.destroy(sessionId);
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

function readRequestSession(
  context: Context,
  config: BffConfig,
  sessions: BrowserSessionStore,
): RequestSession {
  const sessionId = getCookie(context, config.sessionCookieName) ?? null;

  return {
    session: sessions.get(sessionId),
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

  const { token: _token, ...userWithoutToken } = body.user;

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
  const sessionCookieName = options.sessionCookieName
    ?? env.BFF_SESSION_COOKIE_NAME
    ?? DEFAULT_SESSION_COOKIE_NAME;

  return {
    port,
    publicApiBaseUrl: new URL(publicApiBaseUrl),
    sessionCookieName,
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = resolveConfig({});
  const server = createBffServer();

  server.listen(config.port, '0.0.0.0');
}
