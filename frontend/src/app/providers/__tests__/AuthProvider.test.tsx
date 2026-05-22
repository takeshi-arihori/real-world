import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthToken, getAuthToken, setAuthToken } from '../../../lib/authToken';
import { ApiError } from '../../../lib/apiError';
import type { AuthApi, AuthUser } from '../../../features/auth';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../useAuth';

const JAKE: AuthUser = {
  bio: null,
  email: 'jake@example.com',
  image: null,
  username: 'jake',
};

const JANE: AuthUser = {
  bio: 'Writer',
  email: 'jane@example.com',
  image: 'https://example.com/jane.png',
  username: 'jane',
};

function createAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      token: 'fresh-token',
      user: JAKE,
    }),
    login: vi.fn().mockResolvedValue({
      token: 'login-token',
      user: JAKE,
    }),
    register: vi.fn().mockResolvedValue({
      token: 'register-token',
      user: JANE,
    }),
    ...overrides,
  };
}

function AuthProbe(): ReactElement {
  const auth = useAuth();

  return (
    <div>
      <p>{auth.isAuthenticated ? 'authenticated' : 'guest'}</p>
      <p>{auth.user?.username ?? 'no-user'}</p>
      <button
        type="button"
        onClick={() => {
          void auth.login({
            email: 'jake@example.com',
            password: 'secret',
          });
        }}
      >
        login
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.register({
            email: 'jane@example.com',
            password: 'secret',
            username: 'jane',
          });
        }}
      >
        register
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.refresh();
        }}
      >
        refresh
      </button>
      <button type="button" onClick={auth.logout}>
        logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it('persists the token and updates current user after login', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'login' }));

    expect(await screen.findByText('jake')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(getAuthToken()).toBe('login-token');
  });

  it('persists the token and updates current user after register', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'register' }));

    expect(await screen.findByText('jane')).toBeInTheDocument();
    expect(getAuthToken()).toBe('register-token');
  });

  it('refresh clears current user when no token exists', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('authenticated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'refresh' }));

    expect(await screen.findByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(authApi.getCurrentUser).not.toHaveBeenCalled();
  });

  it('refresh clears the token and current user when the API returns unauthorized', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockRejectedValue(
        new ApiError('Unauthorized', {
          bodyErrors: ['Unauthorized'],
          kind: 'unauthorized',
          status: 401,
        }),
      ),
    });
    setAuthToken('expired-token');

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
    expect(getAuthToken()).toBeNull();
  });

  it('logout clears token and current user', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();
    setAuthToken('active-token');

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(getAuthToken()).toBeNull();
  });
});
