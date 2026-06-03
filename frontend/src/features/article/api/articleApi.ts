import { apiClient, type ApiClient } from '@/lib/apiClient';
import type { ArticleListParams, ArticleListResult, ArticleSummary } from '../types/article';

export const ARTICLE_PAGE_SIZE = 10;

export interface ArticleListResponse {
  articles: ArticleResponse[];
  articlesCount: number;
}

interface ArticleResponse {
  author: {
    bio: string | null;
    following: boolean;
    image: string | null;
    username: string;
  };
  createdAt: string;
  description: string;
  favorited: boolean;
  favoritesCount: number;
  slug: string;
  tagList: string[];
  title: string;
  updatedAt: string;
}

/**
 * Global Feedまたはtag filter付きArticle listをBFF経由で取得する。
 */
export async function listArticles(
  params: ArticleListParams,
  client: ApiClient = apiClient,
): Promise<ArticleListResult> {
  const response = await getArticleListResponse(
    client,
    buildArticleListPath('/api/articles', params),
    params.signal,
  );

  return mapArticleListResponse(response);
}

export function mapArticleListResponse(response: ArticleListResponse): ArticleListResult {
  return {
    articles: response.articles.map(mapArticleResponse),
    totalCount: response.articlesCount,
  };
}

function mapArticleResponse(response: ArticleResponse): ArticleSummary {
  return {
    author: {
      bio: response.author.bio,
      following: response.author.following,
      image: response.author.image,
      username: response.author.username,
    },
    createdAt: response.createdAt,
    description: response.description,
    favorited: response.favorited,
    favoritesCount: response.favoritesCount,
    slug: response.slug,
    tags: response.tagList,
    title: response.title,
    updatedAt: response.updatedAt,
  };
}

export function buildArticleListPath(basePath: string, params: ArticleListParams): string {
  const query = new URLSearchParams();
  const tag = params.tag?.trim();

  if (tag !== undefined && tag !== '') {
    query.set('tag', tag);
  }

  query.set('limit', String(params.limit));
  query.set('offset', String(params.offset));

  return `${basePath}?${query.toString()}`;
}

async function getArticleListResponse(
  client: ApiClient,
  path: string,
  signal?: AbortSignal,
): Promise<ArticleListResponse> {
  if (signal === undefined) {
    return client.get<ArticleListResponse>(path);
  }

  return client.get<ArticleListResponse>(path, { signal });
}
