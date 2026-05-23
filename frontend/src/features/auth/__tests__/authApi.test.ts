import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { getCurrentUser, loginUser, registerUser } from '../api/authApi';

/**
 * auth API関数がHTTP clientへ渡すpath/body/optionsを検証するためのclient stubを作る。
 */
function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

describe('認証API', () => {
  it('loginはRealWorld形式の認証情報を未認証リクエストとして送りsessionへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        token: 'login-token',
        username: 'jake',
      },
    });

    const session = await loginUser(
      {
        email: 'jake@example.com',
        password: 'secret',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/users/login',
      {
        user: {
          email: 'jake@example.com',
          password: 'secret',
        },
      },
      { auth: false },
    );
    expect(session).toEqual({
      token: 'login-token',
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        username: 'jake',
      },
    });
  });

  it('registerはRealWorld形式のユーザー情報を未認証リクエストとして送りsessionへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      user: {
        bio: '',
        email: 'jane@example.com',
        image: '',
        token: 'register-token',
        username: 'jane',
      },
    });

    const session = await registerUser(
      {
        email: 'jane@example.com',
        password: 'secret',
        username: 'jane',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/users',
      {
        user: {
          email: 'jane@example.com',
          password: 'secret',
          username: 'jane',
        },
      },
      { auth: false },
    );
    expect(session.token).toBe('register-token');
    expect(session.user.username).toBe('jane');
  });

  it('current userは認証済みRealWorld user endpointを読みsessionへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      user: {
        bio: 'API learner',
        email: 'jake@example.com',
        image: 'https://example.com/avatar.png',
        token: 'fresh-token',
        username: 'jake',
      },
    });

    const session = await getCurrentUser(client);

    expect(client.get).toHaveBeenCalledWith('/api/user');
    expect(session).toEqual({
      token: 'fresh-token',
      user: {
        bio: 'API learner',
        email: 'jake@example.com',
        image: 'https://example.com/avatar.png',
        username: 'jake',
      },
    });
  });
});
