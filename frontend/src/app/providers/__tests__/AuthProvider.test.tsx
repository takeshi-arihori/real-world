import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthApi, AuthUser } from '@/features/auth';
import { ApiError } from '@/lib/apiError';
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
 * AuthProviderがBrowserSession APIの結果だけをcontext状態へ反映することを検証するstubを作る。
 */
function createAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(JAKE),
    login: vi.fn().mockResolvedValue(JAKE),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(JANE),
    updateCurrentUser: vi.fn().mockResolvedValue(JANE),
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
          void auth.updateCurrentUser({
            bio: 'Writer',
            email: 'jane@example.com',
            image: 'https://example.com/jane.png',
            username: 'jane',
          });
        }}
      >
        update
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.refresh();
        }}
      >
        refresh
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.logout();
        }}
      >
        logout
      </button>
    </div>
  );
}

describe('認証Provider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mount時にBrowserSessionからcurrent userを復元しtoken storageへ保存しない', async () => {
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('refreshing')).toBeInTheDocument();
    expect(await screen.findByText('jake')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(window.localStorage.getItem('realworld.authToken')).toBeNull();
    expect(authApi.getCurrentUser).toHaveBeenCalledOnce();
  });

  it('login後にcurrent userを更新しtoken storageへ保存しない', async () => {
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

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByText('guest');
    await user.click(screen.getByRole('button', { name: 'login' }));

    expect(await screen.findByText('jake')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(window.localStorage.getItem('realworld.authToken')).toBeNull();
  });

  it('register後にcurrent userを更新する', async () => {
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

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByText('guest');
    await user.click(screen.getByRole('button', { name: 'register' }));

    expect(await screen.findByText('jane')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
  });

  it('settings update後にcurrent userを更新する', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'update' }));

    expect(await screen.findByText('jane')).toBeInTheDocument();
    expect(authApi.updateCurrentUser).toHaveBeenCalledWith({
      bio: 'Writer',
      email: 'jane@example.com',
      image: 'https://example.com/jane.png',
      username: 'jane',
    });
  });

  it('refreshはtoken storageに依存せずcurrent userを再取得する', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockResolvedValue(JANE),
    });

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'refresh' }));

    expect(await screen.findByText('jane')).toBeInTheDocument();
    expect(authApi.getCurrentUser).toHaveBeenCalledOnce();
  });

  it('current user APIがunauthorizedを返した場合はcurrent userをクリアする', async () => {
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

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
  });

  it('refresh中にlogoutした場合は古いcurrent userを再適用しない', async () => {
    const user = userEvent.setup();
    let resolveRefresh: (user: AuthUser) => void = () => {};
    const refreshPromise = new Promise<AuthUser>((resolve) => {
      resolveRefresh = resolve;
    });
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockReturnValue(refreshPromise),
    });

    render(
      <AuthProvider authApi={authApi}>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('refreshing')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'logout' }));

    resolveRefresh(JAKE);

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
  });

  it('logoutでBFF sessionを破棄してcurrent userをクリアする', async () => {
    const user = userEvent.setup();
    const authApi = createAuthApi();

    render(
      <AuthProvider authApi={authApi} initialUser={JAKE}>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(authApi.logout).toHaveBeenCalledOnce();
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(screen.getByText('no-user')).toBeInTheDocument();
  });
});
