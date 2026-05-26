import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers/AppProviders';
import type { AuthApi, AuthSession, AuthUser } from '@/features/auth';
import { clearAuthToken, setAuthToken } from '@/lib/authToken';
import { createAppRouter } from '../router';

const DEMO_USER: AuthUser = {
  bio: null,
  email: 'demo@example.com',
  image: '',
  username: 'demo-user',
};

/**
 * route integration testがfetchへ依存せず認証結果を制御するためのAPI stubを作る。
 */
function createAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getCurrentUser: async () => ({
      token: 'fresh-token',
      user: DEMO_USER,
    }),
    login: async () => ({
      token: 'login-token',
      user: DEMO_USER,
    }),
    register: async () => ({
      token: 'register-token',
      user: DEMO_USER,
    }),
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

describe('アプリルーター', () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it('未認証ユーザーを必須ルートからreturn path付きログインへ遷移する', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/settings' }));

    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/settings')).toBeInTheDocument();
  });

  it('ログイン後にreturn pathへ復帰する', async () => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/login?returnTo=/editor' }));
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
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
  });

  it('認証済みユーザーをゲスト専用ルートからリダイレクトする', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/login', initialUser: DEMO_USER }));

    expect(
      screen.getByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
  });

  it('未知のルートではnot foundを表示する', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute({ initialPath: '/missing-page' }));

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('保存済みtokenの確認中は必須ルートからログインへ早期遷移しない', async () => {
    const { render } = await import('@testing-library/react');
    let resolveRefresh: (session: AuthSession) => void = () => {};
    const refreshPromise = new Promise<AuthSession>((resolve) => {
      resolveRefresh = resolve;
    });
    const authApi = createAuthApi({
      getCurrentUser: vi.fn().mockReturnValue(refreshPromise),
    });
    setAuthToken('active-token');

    render(renderRoute({ authApi, initialPath: '/settings' }));

    expect(
      screen.queryByRole('heading', { name: 'Sign in' }),
    ).not.toBeInTheDocument();

    resolveRefresh({
      token: 'fresh-token',
      user: DEMO_USER,
    });

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
  });
});
