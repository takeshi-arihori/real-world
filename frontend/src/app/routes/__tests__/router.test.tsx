import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../../providers/AppProviders';
import { createAppRouter } from '../router';

function renderRoute(
  initialPath: string,
  isAuthenticated = false,
): ReactElement {
  return (
    <AppProviders
      initialUser={
        isAuthenticated
          ? {
              image: '',
              username: 'demo-user',
            }
          : null
      }
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
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      screen.getByRole('heading', { name: 'New Article' }),
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
