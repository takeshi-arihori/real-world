import { apiClient, type ApiClient } from '@/lib/apiClient';
import type { ArticleComment } from '../types/comment';

interface CommentListResponse {
  comments: CommentResponse[];
}

interface CommentResponse {
  author: {
    bio: string | null;
    following: boolean;
    image: string | null;
    username: string;
  };
  body: string;
  createdAt: string;
  id: number;
  updatedAt: string;
}

/**
 * Articleに紐づくcomments listをBFF経由で取得する。
 */
export async function listComments(
  slug: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<ArticleComment[]> {
  const path = buildCommentsPath(slug);

  if (signal === undefined) {
    return mapCommentListResponse(await client.get<CommentListResponse>(path));
  }

  return mapCommentListResponse(
    await client.get<CommentListResponse>(path, { signal }),
  );
}

export function mapCommentListResponse(
  response: CommentListResponse,
): ArticleComment[] {
  return response.comments.map(mapCommentResponse);
}

export function buildCommentsPath(slug: string): string {
  return `/api/articles/${encodeURIComponent(slug)}/comments`;
}

function mapCommentResponse(response: CommentResponse): ArticleComment {
  return {
    author: {
      bio: response.author.bio,
      following: response.author.following,
      image: response.author.image,
      username: response.author.username,
    },
    body: response.body,
    createdAt: response.createdAt,
    id: response.id,
    updatedAt: response.updatedAt,
  };
}
