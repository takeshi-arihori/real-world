import { apiClient, type ApiClient } from '@/lib/apiClient';
import type {
  ArticleDetail,
  ArticleListParams,
  ArticleListResult,
  ArticleSummary,
} from '../types/article';

export const ARTICLE_PAGE_SIZE = 10;

export interface ArticleListResponse {
  articles: ArticleResponse[];
  articlesCount: number;
}

export interface SingleArticleResponse {
  article: ArticleDetailResponse;
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

interface ArticleDetailResponse extends ArticleResponse {
  body: string;
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

/**
 * slugで指定されたArticle detailをBFF経由で取得する。
 */
export async function getArticle(
  slug: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<ArticleDetail> {
  const path = buildArticlePath(slug);

  if (signal === undefined) {
    return mapSingleArticleResponse(await client.get<SingleArticleResponse>(path));
  }

  return mapSingleArticleResponse(
    await client.get<SingleArticleResponse>(path, { signal }),
  );
}

/**
 * Articleをfavoriteし、更新後のArticle detailを返す。
 */
export async function favoriteArticle(
  slug: string,
  client: ApiClient = apiClient,
): Promise<ArticleDetail> {
  return mapSingleArticleResponse(
    await client.post<SingleArticleResponse>(`${buildArticlePath(slug)}/favorite`),
  );
}

/**
 * Articleのfavoriteを解除し、更新後のArticle detailを返す。
 */
export async function unfavoriteArticle(
  slug: string,
  client: ApiClient = apiClient,
): Promise<ArticleDetail> {
  return mapSingleArticleResponse(
    await client.delete<SingleArticleResponse>(`${buildArticlePath(slug)}/favorite`),
  );
}

/**
 * Article authorがArticleを削除する。
 */
export async function deleteArticle(
  slug: string,
  client: ApiClient = apiClient,
): Promise<void> {
  await client.delete<null>(buildArticlePath(slug));
}

export function mapSingleArticleResponse(response: SingleArticleResponse): ArticleDetail {
  return mapArticleDetailResponse(response.article);
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

function mapArticleDetailResponse(response: ArticleDetailResponse): ArticleDetail {
  return {
    ...mapArticleResponse(response),
    body: response.body,
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

export function buildArticlePath(slug: string): string {
  return `/api/articles/${encodeURIComponent(slug)}`;
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
