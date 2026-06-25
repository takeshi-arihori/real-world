import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDeferred,
  createFetchMock,
  emptyResponse,
  getRequestLog,
  jsonResponse,
} from '@/test/mockFetch';
import { CommentList } from '../components/CommentList';

describe('CommentList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guestはcommentsを閲覧でき、投稿formではなく認証導線を見る', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        '/api/articles/guest-article/comments': commentsWrapper([
          commentResponse({
            body: 'Public comment.',
            id: 1,
            username: 'reader',
          }),
        ]),
      }),
    );

    render(
      <MemoryRouter>
        <CommentList
          currentUsername={null}
          isAuthenticated={false}
          slug="guest-article"
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Public comment.')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Comment' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Farticle%2Fguest-article',
    );
    expect(screen.getByRole('link', { name: 'sign up' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('authenticated userはcommentを投稿でき、送信中はsubmitを無効化する', async () => {
    const user = userEvent.setup();
    const createResponse = createDeferred<Response>();
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        '/api/articles/create-article/comments': commentsWrapper([]),
        '/api/session/csrf': { csrfToken: 'csrf-token' },
        'POST /api/articles/create-article/comments': createResponse.promise,
      }),
    );

    render(
      <MemoryRouter>
        <CommentList
          currentUsername="demo-user"
          isAuthenticated={true}
          slug="create-article"
        />
      </MemoryRouter>,
    );

    const commentInput = await screen.findByRole('textbox', { name: 'Comment' });
    await user.type(commentInput, 'New comment.');
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(screen.getByRole('button', { name: 'Posting...' })).toBeDisabled();

    createResponse.resolve(
      jsonResponse(
        singleCommentWrapper(
          commentResponse({
            body: 'New comment.',
            id: 2,
            username: 'demo-user',
          }),
        ),
      ),
    );

    expect(await screen.findByText('New comment.')).toBeInTheDocument();
    expect(commentInput).toHaveValue('');
  });

  it('required validationはAPIを呼ばずfield errorを表示する', async () => {
    const user = userEvent.setup();
    const fetchMock = createFetchMock({
      '/api/articles/validation-article/comments': commentsWrapper([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <CommentList
          currentUsername="demo-user"
          isAuthenticated={true}
          slug="validation-article"
        />
      </MemoryRouter>,
    );

    await screen.findByRole('textbox', { name: 'Comment' });
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(screen.getByText('comment.body is required')).toBeInTheDocument();
    expect(getRequestLog(fetchMock)).not.toContain(
      'POST /api/articles/validation-article/comments',
    );
  });

  it('API validation errorを表示し入力値を保持する', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        '/api/articles/api-error-article/comments': commentsWrapper([]),
        '/api/session/csrf': { csrfToken: 'csrf-token' },
        'POST /api/articles/api-error-article/comments': jsonResponse(
          {
            errors: {
              body: ['comment.body is too long'],
            },
          },
          422,
        ),
      }),
    );

    render(
      <MemoryRouter>
        <CommentList
          currentUsername="demo-user"
          isAuthenticated={true}
          slug="api-error-article"
        />
      </MemoryRouter>,
    );

    const commentInput = await screen.findByRole('textbox', { name: 'Comment' });
    await user.type(commentInput, 'Server rejected comment.');
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'comment.body is too long',
    );
    expect(commentInput).toHaveValue('Server rejected comment.');
  });

  it('comment authorだけにdelete actionを表示し、削除成功後にlistから除く', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        '/api/articles/delete-article/comments': commentsWrapper([
          commentResponse({
            body: 'Other user comment.',
            id: 1,
            username: 'reader',
          }),
          commentResponse({
            body: 'Own comment.',
            id: 2,
            username: 'demo-user',
          }),
        ]),
        '/api/session/csrf': { csrfToken: 'csrf-token' },
        'DELETE /api/articles/delete-article/comments/2': emptyResponse(),
      }),
    );

    render(
      <MemoryRouter>
        <CommentList
          currentUsername="demo-user"
          isAuthenticated={true}
          slug="delete-article"
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Other user comment.')).toBeInTheDocument();
    expect(screen.getByText('Own comment.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Delete comment by/ })).toHaveLength(
      1,
    );

    await user.click(
      screen.getByRole('button', { name: 'Delete comment by demo-user' }),
    );

    await waitFor(() => {
      expect(screen.queryByText('Own comment.')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Other user comment.')).toBeInTheDocument();
  });

  it('delete errorを表示し、失敗したcommentをlistに残す', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        '/api/articles/delete-error-article/comments': commentsWrapper([
          commentResponse({
            body: 'Protected comment.',
            id: 3,
            username: 'demo-user',
          }),
        ]),
        '/api/session/csrf': { csrfToken: 'csrf-token' },
        'DELETE /api/articles/delete-error-article/comments/3': jsonResponse(
          {
            errors: {
              body: ['Comment could not be deleted.'],
            },
          },
          403,
        ),
      }),
    );

    render(
      <MemoryRouter>
        <CommentList
          currentUsername="demo-user"
          isAuthenticated={true}
          slug="delete-error-article"
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Protected comment.')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Delete comment by demo-user' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Comment could not be deleted.',
    );
    expect(screen.getByText('Protected comment.')).toBeInTheDocument();
  });
});

function commentsWrapper(comments: unknown[]): unknown {
  return { comments };
}

function singleCommentWrapper(comment: unknown): unknown {
  return { comment };
}

function commentResponse({
  body,
  id,
  username,
}: {
  body: string;
  id: number;
  username: string;
}): unknown {
  return {
    author: {
      bio: null,
      following: false,
      image: null,
      username,
    },
    body,
    createdAt: '2026-05-08T00:00:00.000Z',
    id,
    updatedAt: '2026-05-08T00:00:00.000Z',
  };
}
