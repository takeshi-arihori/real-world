import { apiClient, type ApiClient } from '@/lib/apiClient';
import {
  buildArticleListPath,
  mapArticleListResponse,
  type ArticleListQuery,
  type ArticleListResponse,
  type ArticleListResult,
} from '@/features/article';

/**
 * 認証済みユーザーのYour FeedをBFF経由で取得する。
 */
export async function getFeed(
  params: ArticleListQuery,
  client: ApiClient = apiClient,
): Promise<ArticleListResult> {
  const path = buildArticleListPath('/api/articles/feed', params);

  if (params.signal === undefined) {
    return mapArticleListResponse(await client.get<ArticleListResponse>(path));
  }

  return mapArticleListResponse(
    await client.get<ArticleListResponse>(path, { signal: params.signal }),
  );
}
