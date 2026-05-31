import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser,
} from '../api/authApi';

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
  it('loginはBFF session endpointへ認証情報を送りtokenなしcurrent userへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      user: {
        bio: null,
        email: 'jake@example.com',
        image: null,
        username: 'jake',
      },
    });

    const user = await loginUser(
      {
        email: 'jake@example.com',
        password: 'secret',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/session/login',
      {
        user: {
          email: 'jake@example.com',
          password: 'secret',
        },
      },
    );
    expect(user).toEqual({
      bio: null,
      email: 'jake@example.com',
      image: null,
      username: 'jake',
    });
  });

  it('registerはBFF session endpointへユーザー情報を送りtokenなしcurrent userへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      user: {
        bio: '',
        email: 'jane@example.com',
        image: '',
        username: 'jane',
      },
    });

    const user = await registerUser(
      {
        email: 'jane@example.com',
        password: 'secret',
        username: 'jane',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/session/register',
      {
        user: {
          email: 'jane@example.com',
          password: 'secret',
          username: 'jane',
        },
      },
    );
    expect(user.username).toBe('jane');
  });

  it('current userはBFF BrowserSessionからtokenなしcurrent userを復元する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      user: {
        bio: 'API learner',
        email: 'jake@example.com',
        image: 'https://example.com/avatar.png',
        username: 'jake',
      },
    });

    const user = await getCurrentUser(client);

    expect(client.get).toHaveBeenCalledWith('/api/session');
    expect(user).toEqual({
      bio: 'API learner',
      email: 'jake@example.com',
      image: 'https://example.com/avatar.png',
      username: 'jake',
    });
  });

  it('settings updateはPUT /api/session/userへ空でない値だけを送る', async () => {
    const client = createClient();
    vi.mocked(client.put).mockResolvedValue({
      user: {
        bio: 'API learner',
        email: 'jake@example.com',
        image: null,
        username: 'jake',
      },
    });

    const user = await updateCurrentUser(
      {
        bio: 'API learner',
        email: 'jake@example.com',
        image: null,
        password: undefined,
        username: 'jake',
      },
      client,
    );

    expect(client.put).toHaveBeenCalledWith('/api/session/user', {
      user: {
        bio: 'API learner',
        email: 'jake@example.com',
        image: null,
        username: 'jake',
      },
    });
    expect(user.bio).toBe('API learner');
  });

  it('logoutはBFF session logout endpointを呼ぶ', async () => {
    const client = createClient();
    vi.mocked(client.delete).mockResolvedValue(null);

    await logoutUser(client);

    expect(client.delete).toHaveBeenCalledWith('/api/session');
  });
});
