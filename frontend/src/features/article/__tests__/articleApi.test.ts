import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import {
  ARTICLE_PAGE_SIZE,
  deleteArticle,
  favoriteArticle,
  getArticle,
  listArticles,
  unfavoriteArticle,
} from '../api/articleApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

const ARTICLE_RESPONSE = {
  articles: [
    {
      author: {
        bio: 'API learner',
        following: false,
        image: 'https://example.com/jake.png',
        username: 'jake',
      },
      createdAt: '2026-05-06T00:00:00.000Z',
      description: 'Ever wonder how?',
      favorited: false,
      favoritesCount: 3,
      slug: 'how-to-train-your-dragon',
      tagList: ['dragons', 'training'],
      title: 'How to train your dragon',
      updatedAt: '2026-05-07T00:00:00.000Z',
    },
  ],
  articlesCount: 1,
};

describe('Article API', () => {
  it('Global Feed用のArticle listをlimit/offset付きで取得してfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue(ARTICLE_RESPONSE);

    const result = await listArticles(
      {
        limit: ARTICLE_PAGE_SIZE,
        offset: 20,
      },
      client,
    );

    expect(client.get).toHaveBeenCalledWith('/api/articles?limit=10&offset=20');
    expect(result).toEqual({
      articles: [
        {
          author: {
            bio: 'API learner',
            following: false,
            image: 'https://example.com/jake.png',
            username: 'jake',
          },
          createdAt: '2026-05-06T00:00:00.000Z',
          description: 'Ever wonder how?',
          favorited: false,
          favoritesCount: 3,
          slug: 'how-to-train-your-dragon',
          tags: ['dragons', 'training'],
          title: 'How to train your dragon',
          updatedAt: '2026-05-07T00:00:00.000Z',
        },
      ],
      totalCount: 1,
    });
  });

  it('tag filterをquery parameterとして送る', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      articles: [],
      articlesCount: 0,
    });

    await listArticles(
      {
        limit: ARTICLE_PAGE_SIZE,
        offset: 0,
        tag: 'react patterns',
      },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/articles?tag=react+patterns&limit=10&offset=0',
    );
  });

  it('Profile画面用のauthor filterとfavorited filterをquery parameterとして送る', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      articles: [],
      articlesCount: 0,
    });

    await listArticles(
      {
        author: 'eric',
        limit: ARTICLE_PAGE_SIZE,
        offset: 0,
      },
      client,
    );
    await listArticles(
      {
        favorited: 'space user',
        limit: ARTICLE_PAGE_SIZE,
        offset: 10,
      },
      client,
    );

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/api/articles?author=eric&limit=10&offset=0',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/articles?favorited=space+user&limit=10&offset=10',
    );
  });

  it('Article detailを取得してbodyを含むfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      article: {
        ...ARTICLE_RESPONSE.articles[0],
        body: 'It takes a Jacobian matrix to train your dragon.',
      },
    });

    const result = await getArticle('how-to-train-your-dragon', client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon',
    );
    expect(result).toEqual({
      author: {
        bio: 'API learner',
        following: false,
        image: 'https://example.com/jake.png',
        username: 'jake',
      },
      body: 'It takes a Jacobian matrix to train your dragon.',
      createdAt: '2026-05-06T00:00:00.000Z',
      description: 'Ever wonder how?',
      favorited: false,
      favoritesCount: 3,
      slug: 'how-to-train-your-dragon',
      tags: ['dragons', 'training'],
      title: 'How to train your dragon',
      updatedAt: '2026-05-07T00:00:00.000Z',
    });
  });

  it('favoriteとunfavoriteをArticle detail modelとして返す', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      article: {
        ...ARTICLE_RESPONSE.articles[0],
        body: 'Favorite response body',
        favorited: true,
        favoritesCount: 4,
      },
    });
    vi.mocked(client.delete).mockResolvedValue({
      article: {
        ...ARTICLE_RESPONSE.articles[0],
        body: 'Unfavorite response body',
        favorited: false,
        favoritesCount: 3,
      },
    });

    const favoriteResult = await favoriteArticle('how-to-train-your-dragon', client);
    const unfavoriteResult = await unfavoriteArticle(
      'how-to-train-your-dragon',
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon/favorite',
    );
    expect(client.delete).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon/favorite',
    );
    expect(favoriteResult.favorited).toBe(true);
    expect(favoriteResult.favoritesCount).toBe(4);
    expect(unfavoriteResult.favorited).toBe(false);
    expect(unfavoriteResult.favoritesCount).toBe(3);
  });

  it('Article delete endpointを呼び出す', async () => {
    const client = createClient();
    vi.mocked(client.delete).mockResolvedValue(null);

    await deleteArticle('how-to-train-your-dragon', client);

    expect(client.delete).toHaveBeenCalledWith('/api/articles/how-to-train-your-dragon');
  });
});
