import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import {
  createArticleForEditor,
  getArticleForEditor,
  updateArticleForEditor,
} from '../api/editorApi';

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
  article: {
    author: {
      bio: null,
      following: false,
      image: null,
      username: 'jake',
    },
    body: 'You have to believe',
    createdAt: '2026-05-01T00:00:00.000Z',
    description: 'Ever wonder how?',
    favorited: false,
    favoritesCount: 0,
    slug: 'how-to-train-your-dragon',
    tagList: ['dragons', 'training'],
    title: 'How to train your dragon',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
};

describe('Article Editor API', () => {
  it('edit用Articleを取得してfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue(ARTICLE_RESPONSE);

    const article = await getArticleForEditor('how-to-train-your-dragon', client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon',
    );
    expect(article).toEqual({
      author: {
        username: 'jake',
      },
      body: 'You have to believe',
      description: 'Ever wonder how?',
      slug: 'how-to-train-your-dragon',
      tagList: ['dragons', 'training'],
      title: 'How to train your dragon',
    });
  });

  it('create用payloadをRealWorld形式で送信する', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue(ARTICLE_RESPONSE);

    await createArticleForEditor(
      {
        body: 'You have to believe',
        description: 'Ever wonder how?',
        tagList: ['dragons', 'training'],
        title: 'How to train your dragon',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith('/api/articles', {
      article: {
        body: 'You have to believe',
        description: 'Ever wonder how?',
        tagList: ['dragons', 'training'],
        title: 'How to train your dragon',
      },
    });
  });

  it('update用payloadを対象slugへ送信する', async () => {
    const client = createClient();
    vi.mocked(client.put).mockResolvedValue(ARTICLE_RESPONSE);

    await updateArticleForEditor(
      'how-to-train-your-dragon',
      {
        body: 'Updated body',
        description: 'Updated summary',
        tagList: [],
        title: 'Did you train your dragon?',
      },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/articles/how-to-train-your-dragon',
      {
        article: {
          body: 'Updated body',
          description: 'Updated summary',
          tagList: [],
          title: 'Did you train your dragon?',
        },
      },
    );
  });
});
