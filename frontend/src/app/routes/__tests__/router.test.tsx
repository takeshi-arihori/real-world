import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers/AppProviders';
import type { AuthApi, AuthUser } from '@/features/auth';
import { ApiError } from '@/lib/apiError';
import { createAppRouter } from '../router';

const DEMO_USER: AuthUser = {
  bio: null,
  email: 'demo@example.com',
  image: '',
  username: 'demo-user',
};

const UPDATED_USER: AuthUser = {
  bio: 'Updated bio',
  email: 'updated@example.com',
  image: 'https://example.com/updated.png',
  username: 'updated-user',
};

/**
 * route integration testがfetchへ依存せず認証結果を制御するためのAPI stubを作る。
 */
function createAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getCurrentUser: vi.fn().mockRejectedValue(
      new ApiError('Unauthorized', {
        bodyErrors: ['Unauthorized'],
        kind: 'unauthorized',
        status: 401,
      }),
    ),
    login: vi.fn().mockResolvedValue(DEMO_USER),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(DEMO_USER),
    updateCurrentUser: vi.fn().mockResolvedValue(DEMO_USER),
    ...overrides,
  };
}

/**
 * AppProvidersとmemory routerを組み合わせ、指定pathのルート挙動を検証可能にする。
 */
function renderRoute({
  authApi = createAuthApi(),
  initialPath,
  initialUser = null,
}: {
  authApi?: AuthApi;
  initialPath: string;
  initialUser?: AuthUser | null;
}): ReactElement {
  return (
    <AppProviders authApi={authApi} initialUser={initialUser}>
      <RouterProvider router={createAppRouter([initialPath])} />
    </AppProviders>
  );
}

async function waitForHomeRequestsToSettle(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
  });
}

describe('アプリルーター', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('未認証ユーザーを必須ルートからreturn path付きログインへ遷移する', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/settings' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/settings')).toBeInTheDocument();
  });

  it.each(['/editor', '/editor/existing-article'])(
    '未認証ユーザーを%sからreturn path付きログインへ遷移する',
    async (initialPath) => {
      const { render } = await import('@testing-library/react');

      render(renderRoute({ initialPath }));

      expect(
        await screen.findByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument();
      expect(screen.getByText(initialPath)).toBeInTheDocument();
    },
  );

  it('ログイン後にreturn pathへ復帰する', async () => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/login?returnTo=/editor' }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'New Article' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['protocol-relativeなreturn path', '//evil.example'],
    ['backslashを含むreturn path', '/\\\\evil.example'],
  ])('危険な%sはホームへ戻す', async (_caseName, returnTo) => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: `/login?returnTo=${encodeURIComponent(returnTo)}` }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
    await waitForHomeRequestsToSettle();
  });

  it('認証済みユーザーをゲスト専用ルートからリダイレクトする', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/login', initialUser: DEMO_USER }));

    expect(
      await screen.findByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
    await waitForHomeRequestsToSettle();
  });

  it('未知のルートではnot foundを表示する', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/missing-page' }));

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('BrowserSession確認中は必須ルートからログインへ早期遷移しない', async () => {
    const { render } = await import('@testing-library/react');
    let resolveRefresh: (user: AuthUser) => void = () => {};
    const refreshPromise = new Promise<AuthUser>((resolve) => {
      resolveRefresh = resolve;
    });
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockReturnValue(refreshPromise),
    });

    render(renderRoute({ authApi, initialPath: '/settings' }));

    expect(
      screen.queryByRole('heading', { name: 'Sign in' }),
    ).not.toBeInTheDocument();

    resolveRefresh(DEMO_USER);

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
  });

  it('Settings更新成功後にcurrent user由来の表示を更新する', async () => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');
    const authApi = createAuthApi({
      updateCurrentUser: vi.fn().mockResolvedValue(UPDATED_USER),
    });

    render(
      renderRoute({
        authApi,
        initialPath: '/settings',
        initialUser: DEMO_USER,
      }),
    );

    await user.clear(screen.getByLabelText('Username'));
    await user.type(screen.getByLabelText('Username'), 'updated-user');
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'updated@example.com');
    await user.clear(screen.getByLabelText('Bio'));
    await user.type(screen.getByLabelText('Bio'), 'Updated bio');
    await user.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(authApi.updateCurrentUser).toHaveBeenCalledWith({
      bio: 'Updated bio',
      email: 'updated@example.com',
      image: null,
      username: 'updated-user',
    });
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile/updated-user',
    );
  });

  it('Settings画面のlogoutでHomeへ遷移する', async () => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');
    const authApi = createAuthApi();

    render(
      renderRoute({
        authApi,
        initialPath: '/settings',
        initialUser: DEMO_USER,
      }),
    );

    await user.click(
      within(screen.getByRole('main')).getByRole('button', { name: 'Sign out' }),
    );

    expect(authApi.logout).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
    await waitForHomeRequestsToSettle();
  });
});
