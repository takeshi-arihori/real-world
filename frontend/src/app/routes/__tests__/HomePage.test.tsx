import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers/AppProviders';
import type { AuthApi, AuthUser } from '@/features/auth';
import { ApiError } from '@/lib/apiError';
import { createFetchMock, jsonResponse, type MockRoutes } from '@/test/mockFetch';
import { createAppRouter } from '../router';

const DEMO_USER: AuthUser = {
  bio: null,
  email: 'demo@example.com',
  image: null,
  username: 'demo-user',
};

const GLOBAL_ARTICLES = {
  articles: [
    articleResponse({
      description: 'A public article for everyone',
      slug: 'global-article',
      tagList: ['react'],
      title: 'Global article',
      username: 'global-author',
    }),
  ],
  articlesCount: 21,
};

const YOUR_FEED_ARTICLES = {
  articles: [
    articleResponse({
      description: 'From a followed author',
      slug: 'your-feed-article',
      tagList: ['feed'],
      title: 'Your feed article',
      username: 'followed-author',
    }),
  ],
  articlesCount: 1,
};

const TAG_ARTICLES = {
  articles: [
    articleResponse({
      description: 'Filtered by react',
      slug: 'react-patterns',
      tagList: ['react'],
      title: 'React patterns',
      username: 'tag-author',
    }),
  ],
  articlesCount: 1,
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

function renderHome({
  initialPath = '/',
  initialUser = null,
  routes,
}: {
  initialPath?: string;
  initialUser?: AuthUser | null;
  routes: MockRoutes;
}): ReactElement {
  vi.stubGlobal('fetch', createFetchMock(routes));

  return (
    <AppProviders authApi={createAuthApi()} initialUser={initialUser}>
      <RouterProvider router={createAppRouter([initialPath])} />
    </AppProviders>
  );
}

describe('HomePage feed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guestはGlobal FeedとPopular Tagsを見られ、Your Feed tabは表示されない', async () => {
    render(
      renderHome({
        routes: {
          '/api/articles?limit=10&offset=0': GLOBAL_ARTICLES,
          '/api/tags': { tags: ['react', 'laravel'] },
        },
      }),
    );

    expect(screen.queryByRole('button', { name: 'Your Feed' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Global article' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument();
  });

  it('authenticated userはYour Feed tabへ切り替えられる', async () => {
    const user = userEvent.setup();

    render(
      renderHome({
        initialUser: DEMO_USER,
        routes: {
          '/api/articles/feed?limit=10&offset=0': YOUR_FEED_ARTICLES,
          '/api/articles?limit=10&offset=0': GLOBAL_ARTICLES,
          '/api/tags': { tags: ['react'] },
        },
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Your Feed' }));

    expect(
      await screen.findByRole('heading', { name: 'Your feed article' }),
    ).toBeInTheDocument();
  });

  it('tag clickでselected tag tabとtag filtered articlesを表示する', async () => {
    const user = userEvent.setup();

    render(
      renderHome({
        routes: {
          '/api/articles?limit=10&offset=0': GLOBAL_ARTICLES,
          '/api/articles?tag=react&limit=10&offset=0': TAG_ARTICLES,
          '/api/tags': { tags: ['react', 'laravel'] },
        },
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'react' }));

    expect(screen.getByRole('button', { name: '# react' })).toHaveClass('is-active');
    expect(
      await screen.findByRole('heading', { name: 'React patterns' }),
    ).toBeInTheDocument();
  });

  it('Next pageでlimit/offset paginationの次ページへ切り替える', async () => {
    const user = userEvent.setup();

    render(
      renderHome({
        routes: {
          '/api/articles?limit=10&offset=0': GLOBAL_ARTICLES,
          '/api/articles?limit=10&offset=10': {
            articles: [
              articleResponse({
                description: 'Second page article',
                slug: 'page-two-article',
                tagList: ['page'],
                title: 'Page two article',
                username: 'page-author',
              }),
            ],
            articlesCount: 21,
          },
          '/api/tags': { tags: ['react'] },
        },
      }),
    );

    await screen.findByRole('heading', { name: 'Global article' });
    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(
      await screen.findByRole('heading', { name: 'Page two article' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('Article listのempty stateとerror stateを表示する', async () => {
    const { unmount } = render(
      renderHome({
        routes: {
          '/api/articles?limit=10&offset=0': {
            articles: [],
            articlesCount: 0,
          },
          '/api/tags': { tags: [] },
        },
      }),
    );

    expect(
      await screen.findByText('No articles are here... yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No tags yet.')).toBeInTheDocument();

    unmount();
    vi.unstubAllGlobals();

    render(
      renderHome({
        routes: {
          '/api/articles?limit=10&offset=0': jsonResponse(
            {
              errors: {
                body: ['server error'],
              },
            },
            500,
          ),
          '/api/tags': { tags: ['react'] },
        },
      }),
    );

    expect(
      await screen.findByText('Articles could not be loaded.'),
    ).toBeInTheDocument();
  });
});

function articleResponse({
  description,
  slug,
  tagList,
  title,
  username,
}: {
  description: string;
  slug: string;
  tagList: string[];
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
    description,
    favorited: false,
    favoritesCount: 0,
    slug,
    tagList,
    title,
    updatedAt: '2026-05-06T00:00:00.000Z',
  };
}
