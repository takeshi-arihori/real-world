import { type ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isApiError } from '@/lib/apiError';
import { listComments } from '../api/commentApi';
import type { ArticleComment } from '../types/comment';

interface CommentListProps {
  isAuthenticated: boolean;
  slug: string;
}

type CommentListState =
  | {
      comments: ArticleComment[];
      error: null;
      status: 'loading';
    }
  | {
      comments: ArticleComment[];
      error: null;
      status: 'success';
    }
  | {
      comments: [];
      error: string;
      status: 'error';
    };

/**
 * Article Detail内のread-only comments listを取得して表示する。
 */
export function CommentList({
  isAuthenticated,
  slug,
}: CommentListProps): ReactElement {
  const [state, setState] = useState<CommentListState>({
    comments: [],
    error: null,
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      try {
        const comments = await listComments(slug, undefined, controller.signal);

        if (!isCurrent) {
          return;
        }

        setState({
          comments,
          error: null,
          status: 'success',
        });
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setState({
          comments: [],
          error: getCommentsErrorMessage(error),
          status: 'error',
        });
      }
    }

    void load();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [slug]);

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <h2 id="comments-title">Comments</h2>
      {isAuthenticated ? null : (
        <p className="comment-auth-note">
          <Link to={`/login?returnTo=${encodeURIComponent(`/article/${slug}`)}`}>
            Sign in
          </Link>{' '}
          or <Link to="/register">sign up</Link> to add comments on this article.
        </p>
      )}
      <CommentListContent state={state} />
    </section>
  );
}

interface CommentListContentProps {
  state: CommentListState;
}

function CommentListContent({ state }: CommentListContentProps): ReactElement {
  if (state.status === 'loading') {
    return (
      <div className="comment-list" aria-live="polite">
        <p className="state-message state-message--compact">Loading comments...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="comment-list" aria-live="polite">
        <p className="state-message state-message--compact state-message--error">
          {state.error}
        </p>
      </div>
    );
  }

  if (state.comments.length === 0) {
    return (
      <div className="comment-list" aria-live="polite">
        <p className="state-message state-message--compact">No comments yet.</p>
      </div>
    );
  }

  return (
    <div className="comment-list" aria-live="polite">
      {state.comments.map((comment) => (
        <article className="comment-card" key={comment.id}>
          <p>{comment.body}</p>
          <footer className="comment-card__meta">
            <CommentAvatar comment={comment} />
            <Link to={`/profile/${encodeURIComponent(comment.author.username)}`}>
              {comment.author.username}
            </Link>
            <time dateTime={comment.createdAt}>{formatDisplayDate(comment.createdAt)}</time>
          </footer>
        </article>
      ))}
    </div>
  );
}

interface CommentAvatarProps {
  comment: ArticleComment;
}

function CommentAvatar({ comment }: CommentAvatarProps): ReactElement {
  if (comment.author.image !== null && comment.author.image.trim() !== '') {
    return (
      <img
        alt={`${comment.author.username} avatar`}
        className="avatar avatar--small"
        src={comment.author.image}
      />
    );
  }

  return (
    <span className="avatar avatar--small" aria-hidden="true">
      {comment.author.username.charAt(0).toUpperCase()}
    </span>
  );
}

function getCommentsErrorMessage(error: unknown): string {
  if (isApiError(error) && error.kind === 'not_found') {
    return 'Comments could not be found.';
  }

  return 'Comments could not be loaded.';
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
