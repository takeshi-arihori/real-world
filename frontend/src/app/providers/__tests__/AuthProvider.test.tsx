import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthApi, AuthSession, AuthUser } from '@/features/auth';
import { ApiError } from '@/lib/apiError';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/authToken';
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

/**
 * AuthProviderがAuthApiの結果をcontext状態とtoken storageへ反映することを検証するstubを作る。
 */
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

/**
 * AuthContextの公開契約をユーザー操作から観測できるテスト用component。
 */
function AuthProbe(): ReactElement {
  const auth = useAuth();

  return (
    <div>
      <p>{auth.isAuthenticated ? 'authenticated' : 'guest'}</p>
      <p>{auth.isRefreshing ? 'refreshing' : 'idle'}</p>
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

describe('認証Provider', () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it('login後にtokenを保存してcurrent userを更新する', async () => {
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

  it('register後にtokenを保存してcurrent userを更新する', async () => {
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

  it('tokenがないrefreshではcurrent userをクリアしてAPIを呼ばない', async () => {
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

  it('保存済みtokenがある場合はmount時にcurrent userを復元する', async () => {
    const authApi = createAuthApi();
    setAuthToken('active-token');

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('refreshing')).toBeInTheDocument();
    expect(await screen.findByText('jake')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(getAuthToken()).toBe('fresh-token');
    expect(authApi.getCurrentUser).toHaveBeenCalledOnce();
  });

  it('current user APIがunauthorizedを返した場合はtokenとcurrent userをクリアする', async () => {
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
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getAuthToken()).toBeNull();
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText('guest')).toBeInTheDocument();
  });

  it('current user APIがunauthorized以外で失敗した場合は未認証扱いにして例外を漏らさない', async () => {
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockRejectedValue(
        new ApiError('Network request failed', {
          bodyErrors: [],
          kind: 'network',
        }),
      ),
    });
    setAuthToken('active-token');

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(getAuthToken()).toBe('active-token');
  });

  it('refresh中にlogoutした場合は古いcurrent userを再適用しない', async () => {
    const user = userEvent.setup();
    let resolveRefresh: (session: AuthSession) => void = () => {};
    const refreshPromise = new Promise<AuthSession>((resolve) => {
      resolveRefresh = resolve;
    });
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockReturnValue(refreshPromise),
    });
    setAuthToken('active-token');

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('refreshing')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(getAuthToken()).toBeNull();

    resolveRefresh({
      token: 'fresh-token',
      user: JAKE,
    });

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(getAuthToken()).toBeNull();
  });

  it('logoutでtokenとcurrent userをクリアする', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );
    setAuthToken('active-token');

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
    expect(getAuthToken()).toBeNull();
  });
});
