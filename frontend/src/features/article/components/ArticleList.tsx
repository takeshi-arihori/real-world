import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { isApiError } from '@/lib/apiError';
import { ARTICLE_PAGE_SIZE } from '../api/articleApi';
import type { ArticleSummary, LoadArticles } from '../types/article';

interface ArticleListProps {
  loadArticles: LoadArticles;
  onPageChange: (page: number) => void;
  page: number;
}

type ArticleListState =
  | {
      articles: ArticleSummary[];
      error: null;
      status: 'loading';
      totalCount: number;
    }
  | {
      articles: ArticleSummary[];
      error: null;
      status: 'success';
      totalCount: number;
    }
  | {
      articles: [];
      error: string;
      status: 'error';
      totalCount: 0;
    };

/**
 * Article listの取得状態、一覧表示、paginationをまとめて扱う。
 */
export function ArticleList({
  loadArticles,
  onPageChange,
  page,
}: ArticleListProps): ReactElement {
  const [state, setState] = useState<ArticleListState>({
    articles: [],
    error: null,
    status: 'loading',
    totalCount: 0,
  });
  const offset = useMemo(() => (page - 1) * ARTICLE_PAGE_SIZE, [page]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      try {
        const result = await loadArticles({
          limit: ARTICLE_PAGE_SIZE,
          offset,
          signal: controller.signal,
        });

        if (!isCurrent) {
          return;
        }

        setState({
          articles: result.articles,
          error: null,
          status: 'success',
          totalCount: result.totalCount,
        });
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setState({
          articles: [],
          error: getArticleErrorMessage(error),
          status: 'error',
          totalCount: 0,
        });
      }
    }

    void load();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [loadArticles, offset]);

  if (state.status === 'loading') {
    return (
      <div className="article-list" aria-live="polite">
        <p className="state-message">Loading articles...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="article-list" aria-live="polite">
        <p className="state-message state-message--error">{state.error}</p>
      </div>
    );
  }

  if (state.articles.length === 0) {
    return (
      <div className="article-list" aria-live="polite">
        <p className="state-message">No articles are here... yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="article-list">
        {state.articles.map((article) => (
          <ArticlePreview article={article} key={article.slug} />
        ))}
      </div>
      <ArticlePagination
        onPageChange={onPageChange}
        page={page}
        totalCount={state.totalCount}
      />
    </>
  );
}

interface ArticlePreviewProps {
  article: ArticleSummary;
}

function ArticlePreview({ article }: ArticlePreviewProps): ReactElement {
  return (
    <article className="article-preview">
      <div className="article-preview__meta">
        <Link to={`/profile/${encodeURIComponent(article.author.username)}`}>
          <span className="avatar" aria-hidden="true">
            {article.author.username.charAt(0).toUpperCase()}
          </span>
          {article.author.username}
        </Link>
        <button
          aria-label={`${article.favoritesCount} favorites`}
          className={article.favorited ? 'favorite-button is-active' : 'favorite-button'}
          type="button"
        >
          {article.favoritesCount}
        </button>
      </div>
      <Link className="article-preview__body" to={`/article/${article.slug}`}>
        <h2>{article.title}</h2>
        <p>{article.description}</p>
        <div className="article-preview__footer">
          <span>Read more...</span>
          <span className="tag-row">
            {article.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        </div>
      </Link>
    </article>
  );
}

interface ArticlePaginationProps {
  onPageChange: (page: number) => void;
  page: number;
  totalCount: number;
}

function ArticlePagination({
  onPageChange,
  page,
  totalCount,
}: ArticlePaginationProps): ReactElement | null {
  const pageCount = Math.ceil(totalCount / ARTICLE_PAGE_SIZE);

  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Article pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Previous page
      </button>
      <span>
        Page {page} of {pageCount}
      </span>
      <button
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next page
      </button>
    </nav>
  );
}

function getArticleErrorMessage(error: unknown): string {
  if (isApiError(error) && error.kind === 'unauthorized') {
    return 'Sign in to view your feed.';
  }

  return 'Articles could not be loaded.';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
