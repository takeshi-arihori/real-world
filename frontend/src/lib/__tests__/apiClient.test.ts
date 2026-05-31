import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../apiClient';
import { isApiError } from '../apiError';

/**
 * API clientが扱うJSONレスポンスをテスト用に生成する。
 */
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

/**
 * fetch差し替え時にResponseを返すmockを生成する。
 */
function createFetchMock(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  return fetchMock;
}

/**
 * fetchへ渡されたrequest optionsを検証用に取り出す。
 */
function getRequestOptions(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
  const call = fetchMock.mock.calls.at(0);

  if (call === undefined || call[1] === undefined) {
    throw new Error('fetchがrequest options付きで呼ばれていません');
  }

  // Vitestのmock call引数は広い型なので、以降の検証対象としてRequestInitへ絞る。
  return call[1] as RequestInit;
}

describe('共通API client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('BFFへsame-origin credentials付きでrequestしAuthorization headerを付与しない', async () => {
    const fetchMock = createFetchMock(jsonResponse({ user: { username: 'jake' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'https://app.example.test' });

    await client.get('/api/session');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.example.test/api/session',
      expect.any(Object),
    );

    const requestOptions = getRequestOptions(fetchMock);
    const headers = new Headers(requestOptions.headers);
    expect(requestOptions.credentials).toBe('same-origin');
    expect(headers.get('Authorization')).toBeNull();
    expect(window.localStorage.getItem('realworld.authToken')).toBeNull();
  });

  it('mutating request前にCSRF proofを取得してX-CSRF-TOKEN headerを付与する', async () => {
    const fetchMock = createFetchMock(
      jsonResponse({ csrfToken: 'csrf-proof-1' }),
      jsonResponse({ user: { username: 'jake' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ baseUrl: 'https://app.example.test' });

    await client.post('/api/session/login', {
      user: {
        email: 'jake@example.com',
        password: 'secret',
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://app.example.test/api/session/csrf',
      expect.objectContaining({
        credentials: 'same-origin',
        method: 'GET',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://app.example.test/api/session/login',
      expect.objectContaining({
        body: JSON.stringify({
          user: {
            email: 'jake@example.com',
            password: 'secret',
          },
        }),
        credentials: 'same-origin',
        method: 'POST',
      }),
    );

    const requestOptions = fetchMock.mock.calls.at(1)?.[1] as RequestInit;
    const headers = new Headers(requestOptions.headers);
    expect(headers.get('X-CSRF-TOKEN')).toBe('csrf-proof-1');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('419 CSRF Token MismatchではCSRF proofを再取得して一度だけ再実行する', async () => {
    const fetchMock = createFetchMock(
      jsonResponse({ csrfToken: 'stale-proof' }),
      jsonResponse({ errors: { body: ['CSRF Token Mismatch'] } }, { status: 419 }),
      jsonResponse({ csrfToken: 'fresh-proof' }),
      jsonResponse({ user: { username: 'jane' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ baseUrl: 'https://app.example.test' });

    await client.put('/api/session/user', {
      user: {
        username: 'jane',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.at(2)?.[0]).toBe(
      'https://app.example.test/api/session/csrf',
    );

    const firstMutation = fetchMock.mock.calls.at(1)?.[1] as RequestInit;
    const retriedMutation = fetchMock.mock.calls.at(3)?.[1] as RequestInit;
    expect(new Headers(firstMutation.headers).get('X-CSRF-TOKEN')).toBe(
      'stale-proof',
    );
    expect(new Headers(retriedMutation.headers).get('X-CSRF-TOKEN')).toBe(
      'fresh-proof',
    );
  });

  it('invalid tokenを扱えるよう401レスポンスをunauthorized errorへ正規化する', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(jsonResponse({ errors: { body: ['Unauthorized'] } }, { status: 401 })),
    );
    const client = createApiClient();

    try {
      await client.get('/api/user');
      throw new Error('requestが失敗する想定です');
    } catch (error: unknown) {
      expect(isApiError(error)).toBe(true);

      if (!isApiError(error)) {
        throw error;
      }

      expect(error.kind).toBe('unauthorized');
      expect(error.status).toBe(401);
      expect(error.bodyErrors).toEqual(['Unauthorized']);
    }
  });

  it('再取得後も419の場合はcsrf errorへ正規化する', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        jsonResponse({ csrfToken: 'csrf-proof' }),
        jsonResponse(
          { errors: { body: ['CSRF Token Mismatch'] } },
          { status: 419 },
        ),
        jsonResponse({ csrfToken: 'csrf-proof-2' }),
        jsonResponse(
          { errors: { body: ['CSRF Token Mismatch'] } },
          { status: 419 },
        ),
      ),
    );
    const client = createApiClient();

    try {
      await client.delete('/api/session');
      throw new Error('requestが失敗する想定です');
    } catch (error: unknown) {
      expect(isApiError(error)).toBe(true);

      if (!isApiError(error)) {
        throw error;
      }

      expect(error.kind).toBe('csrf');
      expect(error.status).toBe(419);
      expect(error.bodyErrors).toEqual(['CSRF Token Mismatch']);
    }
  });

  it('RealWorld形式のbody errorsを持つ422レスポンスをvalidation errorへ正規化する', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        jsonResponse(
          { errors: { body: ['email is invalid', 'password is too short'] } },
          { status: 422 },
        ),
      ),
    );
    const client = createApiClient();

    try {
      await client.post('/api/users', {
        user: {
          email: 'invalid',
          password: 'x',
        },
      });
      throw new Error('requestが失敗する想定です');
    } catch (error: unknown) {
      expect(isApiError(error)).toBe(true);

      if (!isApiError(error)) {
        throw error;
      }

      expect(error.kind).toBe('validation');
      expect(error.status).toBe(422);
      expect(error.bodyErrors).toEqual([
        'email is invalid',
        'password is too short',
      ]);
    }
  });

  it('network failureをnetwork errorへ正規化する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const client = createApiClient();

    try {
      await client.get('/api/tags');
      throw new Error('requestが失敗する想定です');
    } catch (error: unknown) {
      expect(isApiError(error)).toBe(true);

      if (!isApiError(error)) {
        throw error;
      }

      expect(error.kind).toBe('network');
      expect(error.status).toBeUndefined();
      expect(error.bodyErrors).toEqual([]);
    }
  });

  it('JSON parse failureをunexpected errorへ正規化する', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        new Response('not json', {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        }),
      ),
    );
    const client = createApiClient();

    try {
      await client.get('/api/tags');
      throw new Error('requestが失敗する想定です');
    } catch (error: unknown) {
      expect(isApiError(error)).toBe(true);

      if (!isApiError(error)) {
        throw error;
      }

      expect(error.kind).toBe('unexpected');
      expect(error.status).toBeUndefined();
    }
  });
});
