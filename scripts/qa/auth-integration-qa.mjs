import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DEFAULT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3005';
const SESSION_COOKIE_NAME = '__Host-conduit_session';
const REQUEST_TIMEOUT_MS = 10_000;
const SERVICE_READY_TIMEOUT_MS = 60_000;
const SERVICE_READY_INTERVAL_MS = 1_000;

const publicApiBaseUrl = trimTrailingSlash(
  process.env.PUBLIC_API_BASE_URL ?? DEFAULT_PUBLIC_API_BASE_URL,
);
const frontendOrigin = trimTrailingSlash(
  process.env.FRONTEND_ORIGIN ?? DEFAULT_FRONTEND_ORIGIN,
);

const runId = createRunId();
const credential = createCredential(runId);

async function main() {
  console.log('auth integration QA');
  console.log(`- Public API: ${publicApiBaseUrl}`);
  console.log(`- Frontend origin: ${frontendOrigin}`);

  await waitForService(
    'Public API',
    async () => {
      const { response } = await requestJson(`${publicApiBaseUrl}/api/user`);
      return response.status === 401;
    },
  );
  await waitForService(
    'frontend /api proxy',
    async () => {
      const jar = new CookieJar();
      const { payload, response } = await requestJson(
        `${frontendOrigin}/api/session/csrf`,
        { jar },
      );

      return response.status === 200 && isRecord(payload) && typeof payload.csrfToken === 'string';
    },
  );

  await verifyPublicJwtApi();
  await verifyBffBrowserSessionViaFrontendOrigin();
  await verifyFrontendProductionCodeDoesNotHandleJwt();

  console.log('auth integration QA passed');
}

async function verifyPublicJwtApi() {
  const user = {
    email: `qa-public-${runId}@example.com`,
    password: credential,
    username: `qa-public-${runId}`,
  };

  const register = await requestJson(`${publicApiBaseUrl}/api/users`, {
    body: { user },
    method: 'POST',
  });
  assertStatus(register, 201, 'Public register returns 201');
  const registerToken = extractUserToken(register.payload, 'Public register');
  assertUserField(register.payload, 'email', user.email, 'Public register');

  const login = await requestJson(`${publicApiBaseUrl}/api/users/login`, {
    body: {
      user: {
        email: user.email,
        password: user.password,
      },
    },
    method: 'POST',
  });
  assertStatus(login, 200, 'Public login returns 200');
  extractUserToken(login.payload, 'Public login');

  const current = await requestJson(`${publicApiBaseUrl}/api/user`, {
    headers: {
      Authorization: `Token ${registerToken}`,
    },
  });
  assertStatus(current, 200, 'Public current user accepts Token scheme JWT');
  assertUserField(current.payload, 'email', user.email, 'Public current user');
  extractUserToken(current.payload, 'Public current user');

  console.log('- Public JWT API contract passed');
}

async function verifyBffBrowserSessionViaFrontendOrigin() {
  const jar = new CookieJar();
  const user = {
    email: `qa-bff-${runId}@example.com`,
    password: credential,
    username: `qa-bff-${runId}`,
  };

  const csrf = await requestJson(`${frontendOrigin}/api/session/csrf`, { jar });
  assertStatus(csrf, 200, 'BFF CSRF bootstrap returns 200');
  const csrfToken = extractCsrfToken(csrf.payload);
  const csrfSetCookie = firstSetCookie(csrf.response);
  assertSessionCookieAttributes(csrfSetCookie, 'BFF CSRF bootstrap');
  const preSessionCookie = jar.get(SESSION_COOKIE_NAME);
  assert.ok(preSessionCookie, 'BFF CSRF bootstrap stores a pre-session cookie');

  const missingCsrf = await requestJson(`${frontendOrigin}/api/session/login`, {
    body: {
      user: {
        email: user.email,
        password: user.password,
      },
    },
    jar,
    method: 'POST',
  });
  assertStatus(missingCsrf, 419, 'BFF login without CSRF proof is rejected');

  const register = await requestJson(`${frontendOrigin}/api/session/register`, {
    body: { user },
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    jar,
    method: 'POST',
  });
  assertStatus(register, 201, 'BFF register via frontend origin returns 201');
  assertUserField(register.payload, 'email', user.email, 'BFF register');
  assertNoUserToken(register.payload, 'BFF register');
  assert.equal(
    jar.get(SESSION_COOKIE_NAME) === preSessionCookie,
    false,
    'BFF register regenerates the session identifier',
  );

  const current = await requestJson(`${frontendOrigin}/api/session`, { jar });
  assertStatus(current, 200, 'BFF current session returns 200');
  assertUserField(current.payload, 'email', user.email, 'BFF current session');
  assertNoUserToken(current.payload, 'BFF current session');

  const blockedDirectIdentity = await requestJson(`${frontendOrigin}/api/user`, { jar });
  assertStatus(
    blockedDirectIdentity,
    404,
    'BFF blocks browser-facing direct identity Public API path',
  );

  const update = await requestJson(`${frontendOrigin}/api/session/user`, {
    body: {
      user: {
        bio: 'QA browser session',
        image: null,
      },
    },
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    jar,
    method: 'PUT',
  });
  assertStatus(update, 200, 'BFF settings update returns 200');
  assertUserField(update.payload, 'bio', 'QA browser session', 'BFF settings update');
  assertNoUserToken(update.payload, 'BFF settings update');

  const logout = await requestJson(`${frontendOrigin}/api/session`, {
    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
    jar,
    method: 'DELETE',
  });
  assertStatus(logout, 204, 'BFF logout returns 204');
  assert.match(firstSetCookie(logout.response), /Max-Age=0/, 'BFF logout expires session cookie');

  const loggedOutCurrent = await requestJson(`${frontendOrigin}/api/session`, { jar });
  assertStatus(loggedOutCurrent, 401, 'BFF current session is unauthorized after logout');

  const loginCsrf = await requestJson(`${frontendOrigin}/api/session/csrf`, { jar });
  assertStatus(loginCsrf, 200, 'BFF CSRF bootstrap after logout returns 200');
  const loginCsrfToken = extractCsrfToken(loginCsrf.payload);

  const login = await requestJson(`${frontendOrigin}/api/session/login`, {
    body: {
      user: {
        email: user.email,
        password: user.password,
      },
    },
    headers: {
      'X-CSRF-TOKEN': loginCsrfToken,
    },
    jar,
    method: 'POST',
  });
  assertStatus(login, 200, 'BFF login via frontend origin returns 200');
  assertUserField(login.payload, 'email', user.email, 'BFF login');
  assertNoUserToken(login.payload, 'BFF login');

  console.log('- BFF BrowserSession Docker path passed');
}

async function verifyFrontendProductionCodeDoesNotHandleJwt() {
  const files = await listSourceFiles('frontend/src');
  const forbidden = [
    { label: 'localStorage', pattern: /\blocalStorage\b/ },
    { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
    { label: 'Authorization header', pattern: /\bAuthorization\b/ },
    { label: 'RealWorld Token scheme', pattern: /(['"`])Token\s/ },
    { label: 'auth token helper', pattern: /authToken/ },
    { label: 'direct localhost Public API', pattern: /localhost:8080/ },
  ];
  const violations = [];

  for (const file of files) {
    const contents = await readFile(file, 'utf8');

    for (const rule of forbidden) {
      if (rule.pattern.test(contents)) {
        violations.push(`${relative(process.cwd(), file)}: ${rule.label}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Frontend production code must not handle browser-readable JWT credentials:\n${violations.join('\n')}`,
  );

  console.log('- Frontend JWT boundary static scan passed');
}

async function requestJson(url, options = {}) {
  const headers = new Headers(options.headers);
  const init = {
    headers,
    method: options.method ?? 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  if (options.jar instanceof CookieJar) {
    const cookieHeader = options.jar.header();

    if (cookieHeader !== '') {
      headers.set('Cookie', cookieHeader);
    }
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, init);

  if (options.jar instanceof CookieJar) {
    options.jar.store(response);
  }

  const text = await response.text();
  const payload = text === '' ? null : parseJson(text, url);

  return {
    payload,
    response,
    text,
  };
}

async function waitForService(label, probe) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < SERVICE_READY_TIMEOUT_MS) {
    try {
      if (await probe()) {
        console.log(`- ${label} is ready`);
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(SERVICE_READY_INTERVAL_MS);
  }

  if (lastError instanceof Error) {
    throw new Error(`${label} did not become ready: ${lastError.message}`);
  }

  throw new Error(`${label} did not become ready`);
}

class CookieJar {
  #cookies = new Map();

  get(name) {
    return this.#cookies.get(name) ?? null;
  }

  header() {
    return Array.from(this.#cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  store(response) {
    for (const setCookie of getSetCookies(response)) {
      const [pair] = setCookie.split(';');

      if (pair === undefined || pair === '') {
        continue;
      }

      const separatorIndex = pair.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const name = pair.slice(0, separatorIndex);
      const value = pair.slice(separatorIndex + 1);

      if (value === '' || /;\s*Max-Age=0\b/i.test(setCookie)) {
        this.#cookies.delete(name);
        continue;
      }

      this.#cookies.set(name, value);
    }
  }
}

async function listSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    const normalizedPath = absolutePath.split('/').join('/');

    if (
      normalizedPath.includes('/__tests__/') ||
      normalizedPath.includes('/test/') ||
      normalizedPath.endsWith('.test.ts') ||
      normalizedPath.endsWith('.test.tsx')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function assertStatus(result, expected, label) {
  assert.equal(
    result.response.status,
    expected,
    `${label}: expected ${expected}, got ${result.response.status} ${JSON.stringify(redact(result.payload))}`,
  );
}

function assertUserField(payload, field, expected, label) {
  assert.ok(isRecord(payload), `${label}: response must be an object`);
  assert.ok(isRecord(payload.user), `${label}: response.user must be an object`);
  assert.equal(payload.user[field], expected, `${label}: user.${field} mismatch`);
}

function assertNoUserToken(payload, label) {
  assert.ok(isRecord(payload), `${label}: response must be an object`);
  assert.ok(isRecord(payload.user), `${label}: response.user must be an object`);
  assert.equal(
    Object.prototype.hasOwnProperty.call(payload.user, 'token'),
    false,
    `${label}: browser-facing user response must not include token`,
  );
}

function extractUserToken(payload, label) {
  assert.ok(isRecord(payload), `${label}: response must be an object`);
  assert.ok(isRecord(payload.user), `${label}: response.user must be an object`);
  assert.equal(typeof payload.user.token, 'string', `${label}: user.token must be a string`);
  assert.notEqual(payload.user.token, '', `${label}: user.token must not be empty`);

  return payload.user.token;
}

function extractCsrfToken(payload) {
  assert.ok(isRecord(payload), 'CSRF response must be an object');
  assert.equal(typeof payload.csrfToken, 'string', 'CSRF token must be a string');
  assert.ok(payload.csrfToken.length >= 32, 'CSRF token should be opaque');

  return payload.csrfToken;
}

function assertSessionCookieAttributes(setCookie, label) {
  assert.match(setCookie, /^__Host-conduit_session=[^;]+;/, `${label}: session cookie name`);
  assert.match(setCookie, /;\s*Path=\//, `${label}: session cookie Path=/`);
  assert.match(setCookie, /;\s*HttpOnly\b/i, `${label}: session cookie HttpOnly`);
  assert.match(setCookie, /;\s*Secure\b/i, `${label}: session cookie Secure`);
  assert.match(setCookie, /;\s*SameSite=Lax\b/i, `${label}: session cookie SameSite=Lax`);
  assert.doesNotMatch(setCookie, /;\s*Domain=/i, `${label}: session cookie must not set Domain`);
}

function firstSetCookie(response) {
  return getSetCookies(response)[0] ?? '';
}

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const setCookie = response.headers.get('set-cookie');

  return setCookie === null ? [] : [setCookie];
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON response from ${url}, got: ${text.slice(0, 120)}`, {
      cause: error,
    });
  }
}

function redact(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const redacted = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = key.toLowerCase().includes('token') ? '[redacted]' : redact(nestedValue);
  }

  return redacted;
}

function createRunId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCredential(value) {
  return `qa-pass-${value}`;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
