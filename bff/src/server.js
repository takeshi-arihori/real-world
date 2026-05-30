import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

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

/**
 * BrowserSession、CSRF、Public API forwarding を扱う Node HTTP server を作成する。
 */
export function createBffServer(options = {}) {
  const config = resolveConfig(options);
  const sessions = options.sessionStore ?? new MemorySessionStore(config.sessionTtlSeconds);

  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, config, sessions);
    } catch {
      if (!response.headersSent) {
        sendJson(response, 500, { errors: { body: ['Internal Server Error'] } });
      } else {
        response.destroy();
      }
    }
  });
}

class MemorySessionStore {
  constructor(ttlSeconds) {
    this.ttlMilliseconds = ttlSeconds * 1000;
    this.sessions = new Map();
  }

  createPreSession() {
    return this.persist({
      csrfToken: randomOpaqueValue(),
      id: randomOpaqueValue(),
      publicJwt: null,
    });
  }

  destroy(sessionId) {
    if (sessionId !== null) {
      this.sessions.delete(sessionId);
    }
  }

  get(sessionId) {
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

  startAuthenticatedSession(previousSession, publicJwt) {
    this.destroy(previousSession.id);

    return this.persist({
      csrfToken: previousSession.csrfToken,
      id: randomOpaqueValue(),
      publicJwt,
    });
  }

  persist(session) {
    const persisted = {
      ...session,
      expiresAt: Date.now() + this.ttlMilliseconds,
    };

    this.sessions.set(persisted.id, persisted);

    return persisted;
  }
}

async function handleRequest(request, response, config, sessions) {
  const url = new URL(request.url ?? '/', 'http://bff.local');
  const method = request.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/session/csrf') {
    handleCsrfBootstrap(request, response, config, sessions);
    return;
  }

  if (method === 'POST' && url.pathname === '/api/session/register') {
    await handleAuthSessionStart(request, response, config, sessions, '/api/users');
    return;
  }

  if (method === 'POST' && url.pathname === '/api/session/login') {
    await handleAuthSessionStart(request, response, config, sessions, '/api/users/login');
    return;
  }

  if (method === 'GET' && url.pathname === '/api/session') {
    await handleAuthenticatedSessionRequest(
      request,
      response,
      config,
      sessions,
      '/api/user',
      null,
    );
    return;
  }

  if (method === 'PUT' && url.pathname === '/api/session/user') {
    await handleAuthenticatedSessionRequest(
      request,
      response,
      config,
      sessions,
      '/api/user',
      request,
    );
    return;
  }

  if (method === 'DELETE' && url.pathname === '/api/session') {
    handleLogout(request, response, config, sessions);
    return;
  }

  if (url.pathname.startsWith('/api/session')) {
    sendJson(response, 404, { errors: { body: ['Not Found'] } });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    await handlePublicApiForwarding(request, response, config, sessions, url);
    return;
  }

  sendJson(response, 404, { errors: { body: ['Not Found'] } });
}

function handleCsrfBootstrap(request, response, config, sessions) {
  const existingSession = readRequestSession(request, config, sessions).session;
  const session = existingSession ?? sessions.createPreSession();

  sendJson(response, 200, { csrfToken: session.csrfToken }, {
    'Set-Cookie': serializeSessionCookie(config, session.id),
  });
}

async function handleAuthSessionStart(request, response, config, sessions, publicPath) {
  const { session } = readRequestSession(request, config, sessions);

  if (!hasValidCsrf(request, session)) {
    sendCsrfMismatch(response);
    return;
  }

  const upstreamResponse = await forwardRequestToPublicApi(request, config, publicPath, null);

  if (!upstreamResponse.ok) {
    await sendUpstreamResponse(response, upstreamResponse);
    return;
  }

  const body = await readJsonResponse(upstreamResponse);
  const publicJwt = extractPublicJwt(body);

  if (publicJwt === null) {
    sendJson(response, 502, { errors: { body: ['Public API response did not include a token'] } });
    return;
  }

  const authenticatedSession = sessions.startAuthenticatedSession(session, publicJwt);
  sendJson(response, upstreamResponse.status, stripUserToken(body), {
    'Set-Cookie': serializeSessionCookie(config, authenticatedSession.id),
  });
}

async function handleAuthenticatedSessionRequest(
  request,
  response,
  config,
  sessions,
  publicPath,
  requestWithBody,
) {
  const { session, sessionId } = readRequestSession(request, config, sessions);

  if (session?.publicJwt === null || session?.publicJwt === undefined) {
    sendJson(response, 401, { errors: { body: ['Unauthorized'] } });
    return;
  }

  if (isMutatingMethod(request) && !hasValidCsrf(request, session)) {
    sendCsrfMismatch(response);
    return;
  }

  const upstreamResponse = await forwardRequestToPublicApi(
    requestWithBody ?? request,
    config,
    publicPath,
    session.publicJwt,
  );

  if (upstreamResponse.status === 401) {
    sessions.destroy(sessionId);
    await sendUpstreamResponse(response, upstreamResponse, {
      setCookie: serializeExpiredSessionCookie(config),
    });
    return;
  }

  if (!upstreamResponse.ok) {
    await sendUpstreamResponse(response, upstreamResponse);
    return;
  }

  const body = await readJsonResponse(upstreamResponse);
  sendJson(response, upstreamResponse.status, stripUserToken(body));
}

function handleLogout(request, response, config, sessions) {
  const { session, sessionId } = readRequestSession(request, config, sessions);

  if (!hasValidCsrf(request, session)) {
    sendCsrfMismatch(response);
    return;
  }

  sessions.destroy(sessionId);
  response.writeHead(204, {
    'Set-Cookie': serializeExpiredSessionCookie(config),
  });
  response.end();
}

async function handlePublicApiForwarding(request, response, config, sessions, url) {
  if (BLOCKED_PUBLIC_IDENTITY_PATHS.has(url.pathname)) {
    sendJson(response, 404, { errors: { body: ['Use the BFF session endpoints'] } });
    return;
  }

  const { session, sessionId } = readRequestSession(request, config, sessions);

  if (isMutatingMethod(request) && !hasValidCsrf(request, session)) {
    sendCsrfMismatch(response);
    return;
  }

  const publicJwt = session?.publicJwt ?? null;
  const upstreamResponse = await forwardRequestToPublicApi(
    request,
    config,
    `${url.pathname}${url.search}`,
    publicJwt,
  );

  if (upstreamResponse.status === 401 && publicJwt !== null) {
    sessions.destroy(sessionId);
    await sendUpstreamResponse(response, upstreamResponse, {
      setCookie: serializeExpiredSessionCookie(config),
    });
    return;
  }

  await sendUpstreamResponse(response, upstreamResponse);
}

async function forwardRequestToPublicApi(request, config, pathAndSearch, publicJwt) {
  const targetUrl = new URL(pathAndSearch, config.publicApiBaseUrl);
  const body = await readRequestBody(request);
  const init = {
    headers: createForwardHeaders(request.headers, publicJwt),
    method: request.method,
    redirect: 'manual',
  };

  if (body.length > 0 && request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = body;
  }

  return fetch(targetUrl, init);
}

function createForwardHeaders(incomingHeaders, publicJwt) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(incomingHeaders)) {
    if (HOP_BY_HOP_REQUEST_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
      continue;
    }

    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }

  if (publicJwt !== null) {
    headers.set('Authorization', `Token ${publicJwt}`);
  }

  return headers;
}

function readRequestSession(request, config, sessions) {
  const sessionId = readCookie(request.headers.cookie, config.sessionCookieName);

  return {
    session: sessions.get(sessionId),
    sessionId,
  };
}

function hasValidCsrf(request, session) {
  if (session === null) {
    return false;
  }

  const header = request.headers[CSRF_HEADER_NAME];
  const submittedToken = Array.isArray(header) ? header[0] : header;

  return submittedToken === session.csrfToken;
}

function isMutatingMethod(request) {
  return MUTATING_METHODS.has(request.method ?? 'GET');
}

async function sendUpstreamResponse(response, upstreamResponse, options = {}) {
  const headers = {};

  upstreamResponse.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(name.toLowerCase())) {
      headers[name] = value;
    }
  });

  if (options.setCookie !== undefined) {
    headers['Set-Cookie'] = options.setCookie;
  }

  const body = Buffer.from(await upstreamResponse.arrayBuffer());
  response.writeHead(upstreamResponse.status, headers);
  response.end(body);
}

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendCsrfMismatch(response) {
  sendJson(response, 419, { errors: { body: ['CSRF token mismatch'] } });
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (text === '') {
    return {};
  }

  return JSON.parse(text);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function extractPublicJwt(body) {
  if (!isRecord(body)) {
    return null;
  }

  const user = body.user;

  if (!isRecord(user) || typeof user.token !== 'string' || user.token === '') {
    return null;
  }

  return user.token;
}

function stripUserToken(body) {
  if (!isRecord(body) || !isRecord(body.user)) {
    return body;
  }

  const { token: _token, ...userWithoutToken } = body.user;

  return {
    ...body,
    user: userWithoutToken,
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeSessionCookie(config, sessionId) {
  return [
    `${config.sessionCookieName}=${encodeURIComponent(sessionId)}`,
    `Max-Age=${config.sessionTtlSeconds}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function serializeExpiredSessionCookie(config) {
  return [
    `${config.sessionCookieName}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function readCookie(cookieHeader, name) {
  if (cookieHeader === undefined) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = cookie.trim().split('=');

    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

function randomOpaqueValue() {
  return randomBytes(32).toString('base64url');
}

function resolveConfig(options) {
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

function readPositiveInteger(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Expected a positive integer configuration value');
  }

  return parsed;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBffServer();
  const config = resolveConfig({});

  server.listen(config.port, '0.0.0.0');
}
