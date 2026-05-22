import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../lib/apiClient';
import { getCurrentUser, loginUser, registerUser } from '../api/authApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

describe('auth API', () => {
  it('login sends RealWorld credentials and maps the returned session', async () => {
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

    expect(client.post).toHaveBeenCalledWith('/api/users/login', {
      user: {
        email: 'jake@example.com',
        password: 'secret',
      },
    });
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

  it('register sends RealWorld user payload and maps the returned session', async () => {
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

    expect(client.post).toHaveBeenCalledWith('/api/users', {
      user: {
        email: 'jane@example.com',
        password: 'secret',
        username: 'jane',
      },
    });
    expect(session.token).toBe('register-token');
    expect(session.user.username).toBe('jane');
  });

  it('current user reads the authenticated RealWorld user endpoint', async () => {
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
