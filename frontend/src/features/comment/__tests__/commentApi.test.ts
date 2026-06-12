import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { listComments } from '../api/commentApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

describe('Comment API', () => {
  it('Article comments listを取得してfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      comments: [
        {
          author: {
            bio: null,
            following: false,
            image: null,
            username: 'reader',
          },
          body: 'Nice article.',
          createdAt: '2026-05-08T00:00:00.000Z',
          id: 1,
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      ],
    });

    const result = await listComments('how-to-train-your-dragon', client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon/comments',
    );
    expect(result).toEqual([
      {
        author: {
          bio: null,
          following: false,
          image: null,
          username: 'reader',
        },
        body: 'Nice article.',
        createdAt: '2026-05-08T00:00:00.000Z',
        id: 1,
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    ]);
  });
});
