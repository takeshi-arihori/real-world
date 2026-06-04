import { apiClient, type ApiClient } from '@/lib/apiClient';

interface TagsResponse {
  tags: string[];
}

interface TagApiOptions {
  signal?: AbortSignal;
}

/**
 * Popular TagsをBFF経由で取得する。
 */
export async function getPopularTags(
  client: ApiClient = apiClient,
  options: TagApiOptions = {},
): Promise<string[]> {
  if (options.signal === undefined) {
    return (await client.get<TagsResponse>('/api/tags')).tags;
  }

  return (await client.get<TagsResponse>('/api/tags', { signal: options.signal })).tags;
}
