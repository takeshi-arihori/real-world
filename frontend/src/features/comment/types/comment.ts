export interface CommentAuthor {
  bio: string | null;
  following: boolean;
  image: string | null;
  username: string;
}

export interface ArticleComment {
  author: CommentAuthor;
  body: string;
  createdAt: string;
  id: number;
  updatedAt: string;
}

export interface CreateCommentInput {
  body: string;
}
