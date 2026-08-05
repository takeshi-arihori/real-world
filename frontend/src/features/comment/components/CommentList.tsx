import {
  type FormEvent,
  type ReactElement,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router';
import { isApiError } from '@/lib/apiError';
import { createComment, deleteComment, listComments } from '../api/commentApi';
import type { ArticleComment } from '../types/comment';

interface CommentListProps {
  currentUsername: string | null;
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
 * Article Detail内のcomments list、投稿form、author-only削除操作を扱う。
 */
export function CommentList({
  currentUsername,
  isAuthenticated,
  slug,
}: CommentListProps): ReactElement {
  const [state, setState] = useState<CommentListState>({
    comments: [],
    error: null,
    status: 'loading',
  });
  const [commentBody, setCommentBody] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      setFormErrors([]);
      setFieldErrors([]);
      setDeleteErrors({});
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const body = commentBody.trim();

    if (body === '') {
      setFormErrors([]);
      setFieldErrors(['comment.body is required']);
      return;
    }

    setFormErrors([]);
    setFieldErrors([]);
    setIsSubmitting(true);

    try {
      const comment = await createComment(slug, { body });

      setState((currentState) => ({
        comments:
          currentState.status === 'success'
            ? [...currentState.comments, comment]
            : [comment],
        error: null,
        status: 'success',
      }));
      setCommentBody('');
    } catch (error: unknown) {
      setFormErrors(getMutationErrorMessages(error, 'Comment could not be posted.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: number): Promise<void> {
    setDeleteErrors((currentErrors) => omitCommentError(currentErrors, commentId));
    setDeletingCommentId(commentId);

    try {
      await deleteComment(slug, commentId);

      setState((currentState) => {
        if (currentState.status !== 'success') {
          return currentState;
        }

        return {
          comments: currentState.comments.filter((comment) => comment.id !== commentId),
          error: null,
          status: 'success',
        };
      });
    } catch (error: unknown) {
      setDeleteErrors((currentErrors) => ({
        ...currentErrors,
        [commentId]: getMutationErrorMessages(
          error,
          'Comment could not be deleted.',
        ).at(0) ?? 'Comment could not be deleted.',
      }));
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <h2 id="comments-title">Comments</h2>
      {isAuthenticated ? (
        <CommentForm
          body={commentBody}
          errors={formErrors}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onBodyChange={setCommentBody}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="comment-auth-note">
          <Link to={`/login?returnTo=${encodeURIComponent(`/article/${slug}`)}`}>
            Sign in
          </Link>{' '}
          or <Link to="/register">sign up</Link> to add comments on this article.
        </p>
      )}
      <CommentListContent
        currentUsername={currentUsername}
        deleteErrors={deleteErrors}
        deletingCommentId={deletingCommentId}
        onDelete={handleDelete}
        state={state}
      />
    </section>
  );
}

interface CommentFormProps {
  body: string;
  errors: string[];
  fieldErrors: string[];
  isSubmitting: boolean;
  onBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function CommentForm({
  body,
  errors,
  fieldErrors,
  isSubmitting,
  onBodyChange,
  onSubmit,
}: CommentFormProps): ReactElement {
  return (
    <form className="comment-form form-stack" noValidate onSubmit={onSubmit}>
      <FormErrorList errors={errors} />
      <div className="form-field">
        <label htmlFor="comment-body">Comment</label>
        <textarea
          aria-describedby={fieldErrors.length > 0 ? 'comment-body-error' : undefined}
          aria-invalid={fieldErrors.length > 0 ? true : undefined}
          id="comment-body"
          onChange={(event) => onBodyChange(event.currentTarget.value)}
          placeholder="Write a comment"
          rows={4}
          value={body}
        />
        <FieldError errors={fieldErrors} id="comment-body-error" />
      </div>
      <div className="form-actions">
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </form>
  );
}

interface CommentListContentProps {
  currentUsername: string | null;
  deleteErrors: Record<number, string>;
  deletingCommentId: number | null;
  onDelete: (commentId: number) => Promise<void>;
  state: CommentListState;
}

function CommentListContent({
  currentUsername,
  deleteErrors,
  deletingCommentId,
  onDelete,
  state,
}: CommentListContentProps): ReactElement {
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
        <CommentCard
          canDelete={currentUsername === comment.author.username}
          comment={comment}
          deleteError={deleteErrors[comment.id]}
          isDeleting={deletingCommentId === comment.id}
          key={comment.id}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface CommentCardProps {
  canDelete: boolean;
  comment: ArticleComment;
  deleteError?: string;
  isDeleting: boolean;
  onDelete: (commentId: number) => Promise<void>;
}

function CommentCard({
  canDelete,
  comment,
  deleteError,
  isDeleting,
  onDelete,
}: CommentCardProps): ReactElement {
  return (
    <article className="comment-card">
      <p>{comment.body}</p>
      <footer className="comment-card__meta">
        <CommentAvatar comment={comment} />
        <Link to={`/profile/${encodeURIComponent(comment.author.username)}`}>
          {comment.author.username}
        </Link>
        <time dateTime={comment.createdAt}>{formatDisplayDate(comment.createdAt)}</time>
        {canDelete ? (
          <button
            aria-label={`Delete comment by ${comment.author.username}`}
            className="danger-action danger-action--compact comment-card__delete"
            disabled={isDeleting}
            onClick={() => {
              void onDelete(comment.id);
            }}
            type="button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        ) : null}
      </footer>
      {deleteError === undefined ? null : (
        <p
          className="state-message state-message--compact state-message--error comment-card__error"
          role="alert"
        >
          {deleteError}
        </p>
      )}
    </article>
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

function getMutationErrorMessages(error: unknown, fallback: string): string[] {
  if (isApiError(error)) {
    return error.bodyErrors.length > 0 ? error.bodyErrors : [error.message];
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return [fallback];
}

function omitCommentError(
  errors: Record<number, string>,
  commentId: number,
): Record<number, string> {
  const nextErrors = { ...errors };

  delete nextErrors[commentId];

  return nextErrors;
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

interface FormErrorListProps {
  errors: string[];
}

function FormErrorList({ errors }: FormErrorListProps): ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul className="form-errors" role="alert">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

interface FieldErrorProps {
  errors: string[];
  id: string;
}

function FieldError({ errors, id }: FieldErrorProps): ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <p className="field-error" id={id}>
      {errors.join(' ')}
    </p>
  );
}
