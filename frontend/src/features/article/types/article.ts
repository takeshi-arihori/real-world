export interface ArticleAuthor {
  bio: string | null;
  following: boolean;
  image: string | null;
  username: string;
}

export interface ArticleSummary {
  author: ArticleAuthor;
  createdAt: string;
  description: string;
  favorited: boolean;
  favoritesCount: number;
  slug: string;
  tags: string[];
  title: string;
  updatedAt: string;
}

export interface ArticleDetail extends ArticleSummary {
  body: string;
}

export interface ArticleListResult {
  articles: ArticleSummary[];
  totalCount: number;
}

export interface ArticleListQuery {
  limit: number;
  offset: number;
  signal?: AbortSignal;
}

export interface ArticleListParams extends ArticleListQuery {
  author?: string;
  favorited?: string;
  tag?: string;
}

export type LoadArticles = (query: ArticleListQuery) => Promise<ArticleListResult>;
