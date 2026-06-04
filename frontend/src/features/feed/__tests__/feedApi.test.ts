import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { getFeed } from '../api/feedApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

describe('Feed API', () => {
  it('Your Feedをlimit/offset付きで取得してArticle list resultへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      articles: [
        {
          author: {
            bio: null,
            following: true,
            image: null,
            username: 'followed-user',
          },
          createdAt: '2026-05-06T00:00:00.000Z',
          description: 'From someone you follow',
          favorited: true,
          favoritesCount: 9,
          slug: 'your-feed-article',
          tagList: ['feed'],
          title: 'Your feed article',
          updatedAt: '2026-05-06T00:00:00.000Z',
        },
      ],
      articlesCount: 1,
    });

    const result = await getFeed(
      {
        limit: 10,
        offset: 10,
      },
      client,
    );

    expect(client.get).toHaveBeenCalledWith('/api/articles/feed?limit=10&offset=10');
    expect(result.articles[0]?.tags).toEqual(['feed']);
    expect(result.totalCount).toBe(1);
  });
});
