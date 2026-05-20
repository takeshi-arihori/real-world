import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../apiClient';
import { clearAuthToken, setAuthToken } from '../authToken';
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
function createFetchMock(response: Response): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(response);
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
    clearAuthToken();
    vi.unstubAllGlobals();
  });

  it('トークンが存在する場合はRealWorld形式の認証ヘッダーを付与する', async () => {
    const fetchMock = createFetchMock(jsonResponse({ user: { username: 'jake' } }));
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('secret-token');

    const client = createApiClient({ baseUrl: 'https://api.example.test' });

    await client.get('/api/user');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/user',
      expect.any(Object),
    );

    const requestOptions = getRequestOptions(fetchMock);
    const headers = new Headers(requestOptions.headers);
    expect(headers.get('Authorization')).toBe('Token secret-token');
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
