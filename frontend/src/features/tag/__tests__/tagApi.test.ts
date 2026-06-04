import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { getPopularTags } from '../api/tagApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

describe('Tag API', () => {
  it('Popular TagsをBFF経由で取得する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      tags: ['react', 'laravel', 'testing'],
    });

    const tags = await getPopularTags(client);

    expect(client.get).toHaveBeenCalledWith('/api/tags');
    expect(tags).toEqual(['react', 'laravel', 'testing']);
  });
});
