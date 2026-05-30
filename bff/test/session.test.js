import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createBffServer } from '../src/server.js';

test('CSRF bootstrap は pre-session cookie と CSRF proof を返す', async () => {
  const upstream = await startUpstreamServer();
  const bff = await startBffServer(upstream.url);

  try {
    const response = await fetch(`${bff.url}/api/session/csrf`);
    const body = await response.json();
    const setCookie = getFirstSetCookie(response);

    assert.equal(response.status, 200);
    assert.equal(typeof body.csrfToken, 'string');
    assert.ok(body.csrfToken.length >= 32);
    assert.match(setCookie, /^__Host-conduit_session=[^;]+;/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.doesNotMatch(setCookie, /Domain=/i);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('mutating session request は CSRF proof なしでは Public API へ転送しない', async () => {
  const upstream = await startUpstreamServer();
  const bff = await startBffServer(upstream.url);

  try {
    const response = await fetch(`${bff.url}/api/session/login`, {
      body: JSON.stringify({ user: { email: 'jake@example.com', password: 'secret' } }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    assert.equal(response.status, 419);
    assert.equal(upstream.requests.length, 0);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('login は Public JWT を Browser response から除去して server-side session に保持する', async () => {
  const upstream = await startUpstreamServer(({ request, response }) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/api/users/login');
    assert.equal(request.headers.authorization, undefined);

    writeJson(response, 200, {
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        token: 'public-jwt',
        username: 'jake',
      },
    });
  });
  const bff = await startBffServer(upstream.url);

  try {
    const csrf = await bootstrapCsrf(bff.url);
    const response = await fetch(`${bff.url}/api/session/login`, {
      body: JSON.stringify({ user: { email: 'jake@example.com', password: 'secret' } }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: csrf.cookie,
        'X-CSRF-TOKEN': csrf.token,
      },
      method: 'POST',
    });
    const body = await response.json();
    const authenticatedCookie = getCookiePair(getFirstSetCookie(response));

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        username: 'jake',
      },
    });
    assert.ok(authenticatedCookie.startsWith('__Host-conduit_session='));
    assert.notEqual(authenticatedCookie, csrf.cookie);
    assert.equal(upstream.requests.length, 1);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('current user と resource forwarding は session JWT を Token scheme で付与する', async () => {
  const upstream = await startUpstreamServer(({ request, response }) => {
    if (request.url === '/api/users/login') {
      writeJson(response, 200, {
        user: {
          bio: null,
          email: 'jake@example.com',
          image: null,
          token: 'public-jwt',
          username: 'jake',
        },
      });
      return;
    }

    if (request.url === '/api/user') {
      assert.equal(request.headers.authorization, 'Token public-jwt');
      writeJson(response, 200, {
        user: {
          bio: null,
          email: 'jake@example.com',
          image: null,
          token: 'public-jwt',
          username: 'jake',
        },
      });
      return;
    }

    if (request.url === '/api/articles/feed?limit=20') {
      assert.equal(request.headers.authorization, 'Token public-jwt');
      writeJson(response, 200, { articles: [], articlesCount: 0 });
      return;
    }

    writeJson(response, 404, { errors: { body: ['not found'] } });
  });
  const bff = await startBffServer(upstream.url);

  try {
    const authenticated = await loginThroughBff(bff.url);

    const currentResponse = await fetch(`${bff.url}/api/session`, {
      headers: { Cookie: authenticated.cookie },
    });
    const currentBody = await currentResponse.json();

    assert.equal(currentResponse.status, 200);
    assert.equal(currentBody.user.token, undefined);

    const feedResponse = await fetch(`${bff.url}/api/articles/feed?limit=20`, {
      headers: { Cookie: authenticated.cookie },
    });
    const feedBody = await feedResponse.json();

    assert.equal(feedResponse.status, 200);
    assert.deepEqual(feedBody, { articles: [], articlesCount: 0 });
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('resource forwarding の mutating request は CSRF proof なしでは拒否する', async () => {
  const upstream = await startUpstreamServer();
  const bff = await startBffServer(upstream.url);

  try {
    const csrf = await bootstrapCsrf(bff.url);
    const response = await fetch(`${bff.url}/api/articles`, {
      body: JSON.stringify({ article: { title: 'Hello' } }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: csrf.cookie,
      },
      method: 'POST',
    });

    assert.equal(response.status, 419);
    assert.equal(upstream.requests.length, 0);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('logout は server-side session と browser cookie を破棄する', async () => {
  const upstream = await startUpstreamServer(({ response }) => {
    writeJson(response, 200, {
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        token: 'public-jwt',
        username: 'jake',
      },
    });
  });
  const bff = await startBffServer(upstream.url);

  try {
    const authenticated = await loginThroughBff(bff.url);
    const response = await fetch(`${bff.url}/api/session`, {
      headers: {
        Cookie: authenticated.cookie,
        'X-CSRF-TOKEN': authenticated.csrfToken,
      },
      method: 'DELETE',
    });
    const expiredCookie = getFirstSetCookie(response);

    assert.equal(response.status, 204);
    assert.match(expiredCookie, /^__Host-conduit_session=;/);
    assert.match(expiredCookie, /Max-Age=0/);

    const currentResponse = await fetch(`${bff.url}/api/session`, {
      headers: { Cookie: authenticated.cookie },
    });
    assert.equal(currentResponse.status, 401);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

test('Public API が 401 を返した session は BFF 側でも失効する', async () => {
  const upstream = await startUpstreamServer(({ request, response }) => {
    if (request.url === '/api/users/login') {
      writeJson(response, 200, {
        user: {
          bio: null,
          email: 'jake@example.com',
          image: null,
          token: 'expired-jwt',
          username: 'jake',
        },
      });
      return;
    }

    if (request.url === '/api/user') {
      assert.equal(request.headers.authorization, 'Token expired-jwt');
      writeJson(response, 401, { errors: { body: ['Unauthorized'] } });
      return;
    }

    if (request.url === '/api/articles') {
      assert.equal(request.headers.authorization, undefined);
      writeJson(response, 200, { articles: [], articlesCount: 0 });
      return;
    }

    writeJson(response, 404, { errors: { body: ['not found'] } });
  });
  const bff = await startBffServer(upstream.url);

  try {
    const authenticated = await loginThroughBff(bff.url);
    const currentResponse = await fetch(`${bff.url}/api/session`, {
      headers: { Cookie: authenticated.cookie },
    });
    const expiredCookie = getFirstSetCookie(currentResponse);

    assert.equal(currentResponse.status, 401);
    assert.match(expiredCookie, /Max-Age=0/);

    const articlesResponse = await fetch(`${bff.url}/api/articles`, {
      headers: { Cookie: authenticated.cookie },
    });
    assert.equal(articlesResponse.status, 200);
  } finally {
    await bff.close();
    await upstream.close();
  }
});

async function loginThroughBff(baseUrl) {
  const csrf = await bootstrapCsrf(baseUrl);
  const response = await fetch(`${baseUrl}/api/session/login`, {
    body: JSON.stringify({ user: { email: 'jake@example.com', password: 'secret' } }),
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrf.cookie,
      'X-CSRF-TOKEN': csrf.token,
    },
    method: 'POST',
  });

  assert.equal(response.status, 200);

  return {
    cookie: getCookiePair(getFirstSetCookie(response)),
    csrfToken: csrf.token,
  };
}

async function bootstrapCsrf(baseUrl) {
  const response = await fetch(`${baseUrl}/api/session/csrf`);
  const body = await response.json();

  assert.equal(response.status, 200);

  return {
    cookie: getCookiePair(getFirstSetCookie(response)),
    token: body.csrfToken,
  };
}

async function startBffServer(publicApiBaseUrl) {
  const server = createBffServer({
    publicApiBaseUrl,
    sessionTtlSeconds: 3600,
  });

  await listen(server);

  return {
    close: () => close(server),
    url: serverUrl(server),
  };
}

async function startUpstreamServer(handler = ({ response }) => {
  writeJson(response, 500, { errors: { body: ['unexpected upstream request'] } });
}) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    requests.push({
      body,
      headers: request.headers,
      method: request.method,
      url: request.url,
    });

    handler({ body, request, response });
  });

  await listen(server);

  return {
    close: () => close(server),
    requests,
    url: serverUrl(server),
  };
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
}

async function close(server) {
  server.close();
  await once(server, 'close');
}

function serverUrl(server) {
  const address = server.address();

  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');

  return `http://127.0.0.1:${address.port}`;
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function getFirstSetCookie(response) {
  const getSetCookie = response.headers.getSetCookie;

  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(response.headers)[0] ?? '';
  }

  return response.headers.get('set-cookie') ?? '';
}

function getCookiePair(setCookie) {
  return setCookie.split(';')[0];
}
