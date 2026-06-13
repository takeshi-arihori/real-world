import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers/AppProviders';
import type { AuthApi, AuthUser } from '@/features/auth';
import { ApiError } from '@/lib/apiError';
import { createAppRouter } from '../router';

const DEMO_USER: AuthUser = {
  bio: null,
  email: 'demo@example.com',
  image: null,
  username: 'demo-user',
};

const PROFILE_USER: AuthUser = {
  bio: 'Profile owner bio',
  email: 'eric@example.com',
  image: null,
  username: 'eric',
};

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

function renderProfileRoute({
  initialPath,
  initialUser = null,
  routes,
}: {
  initialPath: string;
  initialUser?: AuthUser | null;
  routes: Record<string, Response | unknown | unknown[]>;
}): { fetchMock: ReturnType<typeof vi.fn>; view: ReactElement } {
  const fetchMock = createFetchMock(routes);
  vi.stubGlobal('fetch', fetchMock);

  return {
    fetchMock,
    view: (
      <AppProviders authApi={createAuthApi()} initialUser={initialUser}>
        <RouterProvider router={createAppRouter([initialPath])} />
      </AppProviders>
    ),
  };
}

describe('ProfilePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guestはProfile headerとauthored articlesを閲覧でき、follow/settings actionは表示されない', async () => {
    const { view } = renderProfileRoute({
      initialPath: '/profile/eric',
      routes: {
        '/api/articles?author=eric&limit=10&offset=0': articlesWrapper([
          articleResponse({
            slug: 'authored-article',
            title: 'Authored article',
            username: 'eric',
          }),
        ]),
        '/api/profiles/eric': profileWrapper({
          bio: 'Cofounder at Thinkster.',
          username: 'eric',
        }),
      },
    });

    render(view);

    expect(await screen.findByRole('heading', { name: 'eric' })).toBeInTheDocument();
    expect(screen.getByText('Cofounder at Thinkster.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Authored article' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow eric' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Edit Profile Settings' }),
    ).not.toBeInTheDocument();
  });

  it('authenticated userは他ユーザーをfollow/unfollowでき、返却されたfollowing stateを表示へ反映する', async () => {
    const user = userEvent.setup();
    const { view } = renderProfileRoute({
      initialPath: '/profile/eric',
      initialUser: DEMO_USER,
      routes: {
        '/api/articles?author=eric&limit=10&offset=0': articlesWrapper([]),
        '/api/profiles/eric': profileWrapper({
          following: false,
          username: 'eric',
        }),
        '/api/session/csrf': { csrfToken: 'csrf-token' },
        'DELETE /api/profiles/eric/follow': profileWrapper({
          following: false,
          username: 'eric',
        }),
        'POST /api/profiles/eric/follow': profileWrapper({
          following: true,
          username: 'eric',
        }),
      },
    });

    render(view);

    await user.click(await screen.findByRole('button', { name: 'Follow eric' }));
    expect(
      await screen.findByRole('button', { name: 'Unfollow eric' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unfollow eric' }));
    expect(
      await screen.findByRole('button', { name: 'Follow eric' }),
    ).toBeInTheDocument();
  });

  it('自分のProfileではfollow buttonを表示せずsettings導線を表示する', async () => {
    const { view } = renderProfileRoute({
      initialPath: '/profile/eric',
      initialUser: PROFILE_USER,
      routes: {
        '/api/articles?author=eric&limit=10&offset=0': articlesWrapper([]),
        '/api/profiles/eric': profileWrapper({
          bio: 'Profile owner bio',
          username: 'eric',
        }),
      },
    });

    render(view);

    expect(await screen.findByRole('heading', { name: 'eric' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow eric' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Profile Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('favorites routeではFavorited Articles tabとfavorited article listを表示する', async () => {
    const { view } = renderProfileRoute({
      initialPath: '/profile/eric/favorites',
      routes: {
        '/api/articles?favorited=eric&limit=10&offset=0': articlesWrapper([
          articleResponse({
            slug: 'favorited-article',
            title: 'Favorited article',
            username: 'other-author',
          }),
        ]),
        '/api/profiles/eric': profileWrapper({
          username: 'eric',
        }),
      },
    });

    render(view);

    expect(await screen.findByRole('heading', { name: 'eric' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorited Articles' })).toHaveClass(
      'is-active',
    );
    expect(
      await screen.findByRole('heading', { name: 'Favorited article' }),
    ).toBeInTheDocument();
  });

  it('Profile not foundはProfile画面内でNot Found表示にし、article listを読み込まない', async () => {
    const { fetchMock, view } = renderProfileRoute({
      initialPath: '/profile/missing-user',
      routes: {
        '/api/profiles/missing-user': jsonResponse(
          {
            errors: {
              body: ['Not Found'],
            },
          },
          404,
        ),
      },
    });

    render(view);

    expect(
      await screen.findByRole('heading', { name: 'Profile not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The profile could not be found.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function profileWrapper({
  bio = null,
  following = false,
  image = null,
  username,
}: {
  bio?: string | null;
  following?: boolean;
  image?: string | null;
  username: string;
}): unknown {
  return {
    profile: {
      bio,
      following,
      image,
      username,
    },
  };
}

function articlesWrapper(articles: unknown[]): unknown {
  return {
    articles,
    articlesCount: articles.length,
  };
}

function articleResponse({
  slug,
  title,
  username,
}: {
  slug: string;
  title: string;
  username: string;
}): unknown {
  return {
    author: {
      bio: null,
      following: false,
      image: null,
      username,
    },
    createdAt: '2026-05-06T00:00:00.000Z',
    description: 'Profile article description',
    favorited: false,
    favoritesCount: 0,
    slug,
    tagList: ['profile'],
    title,
    updatedAt: '2026-05-06T00:00:00.000Z',
  };
}

function createFetchMock(
  routes: Record<string, Response | unknown | unknown[]>,
): ReturnType<typeof vi.fn> {
  const fetcher: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const path = requestPath(input);
    const method = requestMethod(input, init);
    const response =
      readMockResponse(routes, `${method} ${path}`) ?? readMockResponse(routes, path);

    if (response instanceof Response) {
      return response;
    }

    if (response !== undefined) {
      return jsonResponse(response);
    }

    return jsonResponse(
      {
        errors: {
          body: [`Unhandled request: ${method} ${path}`],
        },
      },
      500,
    );
  };

  return vi.fn(fetcher);
}

function readMockResponse(
  routes: Record<string, Response | unknown | unknown[]>,
  key: string,
): Response | unknown {
  const response = routes[key];

  if (Array.isArray(response)) {
    return response.shift();
  }

  return response;
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    const url = new URL(input, window.location.origin);

    return `${url.pathname}${url.search}`;
  }

  const url = input instanceof URL ? input : new URL(input.url, window.location.origin);

  return `${url.pathname}${url.search}`;
}

function requestMethod(input: RequestInfo | URL, init: RequestInit | undefined): string {
  if (init?.method !== undefined) {
    return init.method.toUpperCase();
  }

  if (input instanceof Request) {
    return input.method.toUpperCase();
  }

  return 'GET';
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}
