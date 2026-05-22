import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AuthApi, AuthUser } from '../../../features/auth';
import { AppProviders } from '../../providers/AppProviders';
import { createAppRouter } from '../router';

const DEMO_USER: AuthUser = {
  bio: null,
  email: 'demo@example.com',
  image: '',
  username: 'demo-user',
};

function createAuthApi(): AuthApi {
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
  };
}

function renderRoute(
  initialPath: string,
  isAuthenticated = false,
): ReactElement {
  return (
    <AppProviders
      authApi={createAuthApi()}
      initialUser={isAuthenticated ? DEMO_USER : null}
    >
      <RouterProvider router={createAppRouter([initialPath])} />
    </AppProviders>
  );
}

describe('app router', () => {
  it('redirects guests from required routes to login with return path', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute('/settings'));

    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/settings')).toBeInTheDocument();
  });

  it('restores the return path after signing in', async () => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');

    render(renderRoute('/login?returnTo=/editor'));
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      screen.getByRole('heading', { name: 'New Article' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['protocol-relative return path', '//evil.example'],
    ['backslash return path', '/\\\\evil.example'],
  ])('falls back to home for unsafe %s', async (_caseName, returnTo) => {
    const user = userEvent.setup();
    const { render } = await import('@testing-library/react');

    render(renderRoute(`/login?returnTo=${encodeURIComponent(returnTo)}`));
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      screen.getByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
  });

  it('redirects authenticated users away from guest routes', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute('/login', true));

    expect(
      screen.getByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
  });

  it('renders not found for unknown routes', async () => {
    const { render } = await import('@testing-library/react');

    render(renderRoute('/missing-page'));

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
