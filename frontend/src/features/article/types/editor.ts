export interface ArticleEditorAuthor {
  username: string;
}

export interface ArticleEditorArticle {
  author: ArticleEditorAuthor;
  body: string;
  description: string;
  slug: string;
  tagList: string[];
  title: string;
}

export interface ArticleEditorInput {
  body: string;
  description: string;
  tagList: string[];
  title: string;
}

export interface ArticleEditorLoadOptions {
  signal?: AbortSignal;
}

export interface ArticleEditorApi {
  createArticle: (input: ArticleEditorInput) => Promise<ArticleEditorArticle>;
  getArticle: (
    slug: string,
    options?: ArticleEditorLoadOptions,
  ) => Promise<ArticleEditorArticle>;
  updateArticle: (
    slug: string,
    input: ArticleEditorInput,
  ) => Promise<ArticleEditorArticle>;
}
