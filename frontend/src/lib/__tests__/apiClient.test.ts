import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../apiClient';
import { clearAuthToken, setAuthToken } from '../authToken';
import { isApiError } from '../apiError';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function createFetchMock(response: Response): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(response);
}

function getRequestOptions(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
  const call = fetchMock.mock.calls.at(0);

  if (call === undefined || call[1] === undefined) {
    throw new Error('fetch was not called with request options');
  }

  return call[1] as RequestInit;
}

describe('apiClient', () => {
  beforeEach(() => {
    clearAuthToken();
    vi.unstubAllGlobals();
  });

  it('injects the RealWorld auth header when a token exists', async () => {
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

  it('normalizes unauthorized responses for invalid token handling', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(jsonResponse({ errors: { body: ['Unauthorized'] } }, { status: 401 })),
    );
    const client = createApiClient();

    try {
      await client.get('/api/user');
      throw new Error('Expected request to fail');
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

  it('normalizes validation responses with RealWorld body errors', async () => {
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
      throw new Error('Expected request to fail');
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

  it('normalizes network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const client = createApiClient();

    try {
      await client.get('/api/tags');
      throw new Error('Expected request to fail');
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

  it('normalizes JSON parse failures as unexpected errors', async () => {
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
      throw new Error('Expected request to fail');
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
