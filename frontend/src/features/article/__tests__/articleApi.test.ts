import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { ARTICLE_PAGE_SIZE, listArticles } from '../api/articleApi';

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
});
