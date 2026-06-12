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

const AUTHOR_USER: AuthUser = {
  bio: 'Author bio',
  email: 'author@example.com',
  image: null,
  username: 'article-author',
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

function renderArticleRoute({
  initialPath,
  initialUser = null,
  routes,
}: {
  initialPath: string;
  initialUser?: AuthUser | null;
  routes: Record<string, unknown | unknown[]>;
}): ReactElement {
  vi.stubGlobal('fetch', createFetchMock(routes));

  return (
    <AppProviders authApi={createAuthApi()} initialUser={initialUser}>
      <RouterProvider router={createAppRouter([initialPath])} />
    </AppProviders>
  );
}

describe('ArticleDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guestはArticle Detailとcomments listを閲覧でき、favorite操作ではloginへ誘導される', async () => {
    const user = userEvent.setup();

    render(
      renderArticleRoute({
        initialPath: '/article/guest-article',
        routes: {
          '/api/articles/guest-article': articleWrapper({
            body: 'Guest readable article body.',
            favoritesCount: 3,
            slug: 'guest-article',
            title: 'Guest readable article',
          }),
          '/api/articles/guest-article/comments': commentsWrapper([
            commentResponse({
              body: 'A public comment.',
              id: 1,
              username: 'reader',
            }),
          ]),
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Guest readable article' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Guest readable article body.')).toBeInTheDocument();
    expect(screen.getByText('A public comment.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Favorite Article (3)' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/article/guest-article')).toBeInTheDocument();
  });

  it('authenticated non-authorはfavoriteとunfavoriteでcountを更新でき、author actionsは表示されない', async () => {
    const user = userEvent.setup();

    render(
      renderArticleRoute({
        initialPath: '/article/non-author-article',
        initialUser: DEMO_USER,
        routes: {
          '/api/articles/non-author-article': articleWrapper({
            favoritesCount: 3,
            slug: 'non-author-article',
            title: 'Non author article',
          }),
          '/api/articles/non-author-article/comments': commentsWrapper([]),
          '/api/session/csrf': { csrfToken: 'csrf-token' },
          'DELETE /api/articles/non-author-article/favorite': articleWrapper({
            favorited: false,
            favoritesCount: 3,
            slug: 'non-author-article',
            title: 'Non author article',
          }),
          'POST /api/articles/non-author-article/favorite': articleWrapper({
            favorited: true,
            favoritesCount: 4,
            slug: 'non-author-article',
            title: 'Non author article',
          }),
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Non author article' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Favorite Article (3)' }));
    expect(
      await screen.findByRole('button', { name: 'Unfavorite Article (4)' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unfavorite Article (4)' }));
    expect(
      await screen.findByRole('button', { name: 'Favorite Article (3)' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit Article' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete Article' }),
    ).not.toBeInTheDocument();
  });

  it('authorだけがedit/delete actionを使え、delete成功後はHomeへ遷移する', async () => {
    const user = userEvent.setup();

    render(
      renderArticleRoute({
        initialPath: '/article/author-article',
        initialUser: AUTHOR_USER,
        routes: {
          '/api/articles/author-article': articleWrapper({
            authorUsername: AUTHOR_USER.username,
            slug: 'author-article',
            title: 'Author article',
          }),
          '/api/articles/author-article/comments': commentsWrapper([]),
          '/api/articles?limit=10&offset=0': {
            articles: [],
            articlesCount: 0,
          },
          '/api/session/csrf': { csrfToken: 'csrf-token' },
          '/api/tags': { tags: [] },
          'DELETE /api/articles/author-article': emptyResponse(),
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Author article' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Article' })).toHaveAttribute(
      'href',
      '/editor/author-article',
    );

    await user.click(screen.getByRole('button', { name: 'Delete Article' }));

    expect(
      await screen.findByRole('heading', { name: 'Global Feed' }),
    ).toBeInTheDocument();
  });

  it('404 slugはArticle Detail内でNot Found表示にする', async () => {
    render(
      renderArticleRoute({
        initialPath: '/article/missing-article',
        routes: {
          '/api/articles/missing-article': jsonResponse(
            {
              errors: {
                body: ['Not Found'],
              },
            },
            404,
          ),
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Article not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The article could not be found.')).toBeInTheDocument();
  });
});

function articleWrapper({
  authorUsername = 'article-author',
  body = 'Article body.',
  favorited = false,
  favoritesCount = 0,
  slug,
  title,
}: {
  authorUsername?: string;
  body?: string;
  favorited?: boolean;
  favoritesCount?: number;
  slug: string;
  title: string;
}): unknown {
  return {
    article: {
      author: {
        bio: 'Author bio',
        following: false,
        image: null,
        username: authorUsername,
      },
      body,
      createdAt: '2026-05-06T00:00:00.000Z',
      description: 'Article description',
      favorited,
      favoritesCount,
      slug,
      tagList: ['react', 'realworld'],
      title,
      updatedAt: '2026-05-07T00:00:00.000Z',
    },
  };
}

function commentsWrapper(comments: unknown[]): unknown {
  return { comments };
}

function commentResponse({
  body,
  id,
  username,
}: {
  body: string;
  id: number;
  username: string;
}): unknown {
  return {
    author: {
      bio: null,
      following: false,
      image: null,
      username,
    },
    body,
    createdAt: '2026-05-08T00:00:00.000Z',
    id,
    updatedAt: '2026-05-08T00:00:00.000Z',
  };
}

function createFetchMock(routes: Record<string, unknown | unknown[]>): typeof fetch {
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
  routes: Record<string, unknown | unknown[]>,
  key: string,
): unknown {
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

function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}
