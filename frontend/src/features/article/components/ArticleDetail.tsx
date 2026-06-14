import { type ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CommentList } from '@/features/comment';
import { isApiError } from '@/lib/apiError';
import {
  deleteArticle,
  favoriteArticle,
  getArticle,
  unfavoriteArticle,
} from '../api/articleApi';
import type { ArticleAuthor, ArticleDetail as ArticleDetailModel } from '../types/article';

interface ArticleDetailProps {
  currentUsername: string | null;
  isAuthenticated: boolean;
  onDeleted: () => void;
  onRequireAuth: () => void;
  slug: string;
}

type ArticleDetailState =
  | {
      article: null;
      error: null;
      status: 'loading';
    }
  | {
      article: ArticleDetailModel;
      error: null;
      status: 'success';
    }
  | {
      article: null;
      error: string;
      status: 'error' | 'not_found';
    };

/**
 * Article Detail画面の取得状態、favorite、author action、comments listをまとめる。
 */
export function ArticleDetail({
  currentUsername,
  isAuthenticated,
  onDeleted,
  onRequireAuth,
  slug,
}: ArticleDetailProps): ReactElement {
  const [state, setState] = useState<ArticleDetailState>({
    article: null,
    error: null,
    status: 'loading',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      setActionError(null);
      setState({
        article: null,
        error: null,
        status: 'loading',
      });

      try {
        const article = await getArticle(slug, undefined, controller.signal);

        if (!isCurrent) {
          return;
        }

        setState({
          article,
          error: null,
          status: 'success',
        });
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setState({
          article: null,
          error: getArticleErrorMessage(error),
          status: isApiError(error) && error.kind === 'not_found' ? 'not_found' : 'error',
        });
      }
    }

    void load();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [slug]);

  if (state.status === 'loading') {
    return (
      <section className="article-detail" aria-live="polite">
        <p className="state-message">Loading article...</p>
      </section>
    );
  }

  if (state.status === 'not_found') {
    return (
      <section className="article-detail" aria-labelledby="article-not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="article-not-found-title">Article not found</h1>
        <p className="article-detail__dek">{state.error}</p>
        <Link className="primary-action article-detail__home-link" to="/">
          Go home
        </Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="article-detail" aria-live="polite">
        <p className="state-message state-message--error">{state.error}</p>
      </section>
    );
  }

  if (state.article === null) {
    return (
      <section className="article-detail" aria-live="polite">
        <p className="state-message state-message--error">Article could not be loaded.</p>
      </section>
    );
  }

  const article = state.article;
  const isAuthor = currentUsername === article.author.username;

  async function handleFavorite(): Promise<void> {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setActionError(null);
    setIsFavoriteSaving(true);

    try {
      const updatedArticle = article.favorited
        ? await unfavoriteArticle(article.slug)
        : await favoriteArticle(article.slug);

      setState({
        article: updatedArticle,
        error: null,
        status: 'success',
      });
    } catch (error: unknown) {
      setActionError(getActionErrorMessage(error, 'Favorite could not be updated.'));
    } finally {
      setIsFavoriteSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setActionError(null);
    setIsDeleting(true);

    try {
      await deleteArticle(article.slug);
      onDeleted();
    } catch (error: unknown) {
      setActionError(getActionErrorMessage(error, 'Article could not be deleted.'));
      setIsDeleting(false);
    }
  }

  return (
    <article className="article-detail" aria-labelledby="article-title">
      <header className="article-detail__header">
        <p className="eyebrow">Article</p>
        <h1 id="article-title">{article.title}</h1>
        <ArticleMeta author={article.author} createdAt={article.createdAt} />
        <ArticleActions
          article={article}
          isAuthor={isAuthor}
          isDeleting={isDeleting}
          isFavoriteSaving={isFavoriteSaving}
          onDelete={handleDelete}
          onFavorite={handleFavorite}
        />
        {actionError === null ? null : (
          <p className="state-message state-message--compact state-message--error" role="alert">
            {actionError}
          </p>
        )}
      </header>

      <div className="article-detail__body">
        <p>{article.body}</p>
      </div>

      <div className="tag-row article-detail__tags">
        {article.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <footer className="article-detail__footer">
        <ArticleMeta author={article.author} createdAt={article.createdAt} />
      </footer>

      <CommentList
        currentUsername={currentUsername}
        isAuthenticated={isAuthenticated}
        slug={article.slug}
      />
    </article>
  );
}

interface ArticleMetaProps {
  author: ArticleAuthor;
  createdAt: string;
}

function ArticleMeta({ author, createdAt }: ArticleMetaProps): ReactElement {
  return (
    <div className="article-meta">
      <AuthorAvatar author={author} />
      <div>
        <Link to={`/profile/${encodeURIComponent(author.username)}`}>
          {author.username}
        </Link>
        <time dateTime={createdAt}>{formatDisplayDate(createdAt)}</time>
      </div>
    </div>
  );
}

interface AuthorAvatarProps {
  author: ArticleAuthor;
}

function AuthorAvatar({ author }: AuthorAvatarProps): ReactElement {
  if (author.image !== null && author.image.trim() !== '') {
    return (
      <img
        alt={`${author.username} avatar`}
        className="avatar"
        src={author.image}
      />
    );
  }

  return (
    <span className="avatar" aria-hidden="true">
      {author.username.charAt(0).toUpperCase()}
    </span>
  );
}

interface ArticleActionsProps {
  article: ArticleDetailModel;
  isAuthor: boolean;
  isDeleting: boolean;
  isFavoriteSaving: boolean;
  onDelete: () => Promise<void>;
  onFavorite: () => Promise<void>;
}

function ArticleActions({
  article,
  isAuthor,
  isDeleting,
  isFavoriteSaving,
  onDelete,
  onFavorite,
}: ArticleActionsProps): ReactElement {
  if (isAuthor) {
    return (
      <div className="article-actions">
        <Link className="secondary-action" to={`/editor/${encodeURIComponent(article.slug)}`}>
          Edit Article
        </Link>
        <button
          className="danger-action danger-action--compact"
          disabled={isDeleting}
          onClick={() => {
            void onDelete();
          }}
          type="button"
        >
          Delete Article
        </button>
      </div>
    );
  }

  const label = article.favorited ? 'Unfavorite Article' : 'Favorite Article';

  return (
    <div className="article-actions">
      <button
        aria-pressed={article.favorited}
        className={article.favorited ? 'favorite-button is-active' : 'favorite-button'}
        disabled={isFavoriteSaving}
        onClick={() => {
          void onFavorite();
        }}
        type="button"
      >
        {label} ({article.favoritesCount})
      </button>
    </div>
  );
}

function getArticleErrorMessage(error: unknown): string {
  if (isApiError(error) && error.kind === 'not_found') {
    return 'The article could not be found.';
  }

  return 'Article could not be loaded.';
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.bodyErrors.at(0) ?? fallback;
  }

  return fallback;
}

function formatDisplayDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
