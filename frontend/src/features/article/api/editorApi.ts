import { apiClient, type ApiClient } from '@/lib/apiClient';
import type {
  ArticleEditorApi,
  ArticleEditorArticle,
  ArticleEditorInput,
  ArticleEditorLoadOptions,
} from '../types/editor';

interface ArticleEditorResponse {
  article: {
    author: {
      username: string;
    };
    body: string;
    description: string;
    slug: string;
    tagList: string[];
    title: string;
  };
}

/**
 * Editor edit flowで既存Articleを取得し、フォーム用modelへ変換する。
 */
export async function getArticleForEditor(
  slug: string,
  client: ApiClient = apiClient,
  options: ArticleEditorLoadOptions = {},
): Promise<ArticleEditorArticle> {
  const path = buildArticleEditorPath(slug);
  const response =
    options.signal === undefined
      ? await client.get<ArticleEditorResponse>(path)
      : await client.get<ArticleEditorResponse>(path, { signal: options.signal });

  return mapArticleEditorResponse(response);
}

/**
 * Editor create flowの入力をRealWorld形式でBFFへ送信する。
 */
export async function createArticleForEditor(
  input: ArticleEditorInput,
  client: ApiClient = apiClient,
): Promise<ArticleEditorArticle> {
  const response = await client.post<ArticleEditorResponse>('/api/articles', {
    article: input,
  });

  return mapArticleEditorResponse(response);
}

/**
 * Editor edit flowの入力を対象Article slugへ送信する。
 */
export async function updateArticleForEditor(
  slug: string,
  input: ArticleEditorInput,
  client: ApiClient = apiClient,
): Promise<ArticleEditorArticle> {
  const response = await client.put<ArticleEditorResponse>(
    buildArticleEditorPath(slug),
    {
      article: input,
    },
  );

  return mapArticleEditorResponse(response);
}

export const editorApi: ArticleEditorApi = {
  createArticle: (input: ArticleEditorInput): Promise<ArticleEditorArticle> =>
    createArticleForEditor(input),
  getArticle: (
    slug: string,
    options?: ArticleEditorLoadOptions,
  ): Promise<ArticleEditorArticle> =>
    getArticleForEditor(slug, apiClient, options),
  updateArticle: (
    slug: string,
    input: ArticleEditorInput,
  ): Promise<ArticleEditorArticle> => updateArticleForEditor(slug, input),
};

function mapArticleEditorResponse(
  response: ArticleEditorResponse,
): ArticleEditorArticle {
  return {
    author: {
      username: response.article.author.username,
    },
    body: response.article.body,
    description: response.article.description,
    slug: response.article.slug,
    tagList: response.article.tagList,
    title: response.article.title,
  };
}

function buildArticleEditorPath(slug: string): string {
  return `/api/articles/${encodeURIComponent(slug)}`;
}
