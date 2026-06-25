import { apiClient, type ApiClient } from '@/lib/apiClient';
import type { ArticleComment, CreateCommentInput } from '../types/comment';

interface CommentListResponse {
  comments: CommentResponse[];
}

interface SingleCommentResponse {
  comment: CommentResponse;
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

/**
 * Articleへcommentを投稿し、作成されたcommentをfrontend modelへ変換する。
 */
export async function createComment(
  slug: string,
  input: CreateCommentInput,
  client: ApiClient = apiClient,
): Promise<ArticleComment> {
  const response = await client.post<SingleCommentResponse>(
    buildCommentsPath(slug),
    {
      comment: {
        body: input.body,
      },
    },
  );

  return mapCommentResponse(response.comment);
}

/**
 * Articleに紐づくcommentを削除する。
 */
export async function deleteComment(
  slug: string,
  commentId: number,
  client: ApiClient = apiClient,
): Promise<void> {
  await client.delete<null>(buildCommentPath(slug, commentId));
}

export function mapCommentListResponse(
  response: CommentListResponse,
): ArticleComment[] {
  return response.comments.map(mapCommentResponse);
}

export function buildCommentsPath(slug: string): string {
  return `/api/articles/${encodeURIComponent(slug)}/comments`;
}

export function buildCommentPath(slug: string, commentId: number): string {
  return `${buildCommentsPath(slug)}/${encodeURIComponent(String(commentId))}`;
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
