import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { createComment, deleteComment, listComments } from '../api/commentApi';

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

  it('Article commentを投稿してfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      comment: {
        author: {
          bio: null,
          following: false,
          image: null,
          username: 'demo-user',
        },
        body: 'New comment.',
        createdAt: '2026-05-09T00:00:00.000Z',
        id: 2,
        updatedAt: '2026-05-09T00:00:00.000Z',
      },
    });

    const result = await createComment(
      'how-to-train-your-dragon',
      { body: 'New comment.' },
      client,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon/comments',
      {
        comment: {
          body: 'New comment.',
        },
      },
    );
    expect(result).toEqual({
      author: {
        bio: null,
        following: false,
        image: null,
        username: 'demo-user',
      },
      body: 'New comment.',
      createdAt: '2026-05-09T00:00:00.000Z',
      id: 2,
      updatedAt: '2026-05-09T00:00:00.000Z',
    });
  });

  it('Article commentを削除する', async () => {
    const client = createClient();
    vi.mocked(client.delete).mockResolvedValue(null);

    await deleteComment('how-to-train-your-dragon', 3, client);

    expect(client.delete).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon/comments/3',
    );
  });
});
