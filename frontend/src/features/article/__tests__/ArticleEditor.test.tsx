import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiError';
import { ArticleEditor } from '../components/ArticleEditor';
import type { ArticleEditorApi, ArticleEditorArticle } from '../types/editor';

const OWN_ARTICLE: ArticleEditorArticle = {
  author: {
    username: 'jake',
  },
  body: 'Existing body',
  description: 'Existing summary',
  slug: 'existing-article',
  tagList: ['react', 'tdd'],
  title: 'Existing article',
};

const CREATED_ARTICLE: ArticleEditorArticle = {
  ...OWN_ARTICLE,
  body: 'Created body',
  description: 'Created summary',
  slug: 'created-article',
  tagList: ['react', 'testing'],
  title: 'Created article',
};

function createEditorApi(
  overrides: Partial<ArticleEditorApi> = {},
): ArticleEditorApi {
  return {
    createArticle: vi.fn().mockResolvedValue(CREATED_ARTICLE),
    getArticle: vi.fn().mockResolvedValue(OWN_ARTICLE),
    updateArticle: vi.fn().mockResolvedValue({
      ...OWN_ARTICLE,
      slug: 'updated-article',
    }),
    ...overrides,
  };
}

function renderEditor({
  api = createEditorApi(),
  currentUsername = 'jake',
  initialPath = '/editor',
  slug,
}: {
  api?: ArticleEditorApi;
  currentUsername?: string;
  initialPath?: string;
  slug?: string;
}): void {
  const editorPath = slug === undefined ? '/editor' : '/editor/:slug';

  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          element={
            <ArticleEditor
              currentUsername={currentUsername}
              editorApi={api}
              slug={slug}
            />
          }
          path={editorPath}
        />
        <Route element={<ArticleDestination />} path="/article/:slug" />
      </Routes>
    </MemoryRouter>,
  );
}

function ArticleDestination(): ReactElement {
  const { slug } = useParams();

  return <h1>Article detail: {slug}</h1>;
}

describe('ArticleEditor', () => {
  it('create formを送信し成功後にArticle Detailへ遷移する', async () => {
    const user = userEvent.setup();
    const api = createEditorApi();

    renderEditor({ api });

    await user.type(screen.getByLabelText('Title'), 'Created article');
    await user.type(screen.getByLabelText('Description'), 'Created summary');
    await user.type(screen.getByLabelText('Body'), 'Created body');
    await user.type(screen.getByLabelText('Tags'), 'react, testing');
    await user.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(api.createArticle).toHaveBeenCalledWith({
      body: 'Created body',
      description: 'Created summary',
      tagList: ['react', 'testing'],
      title: 'Created article',
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Article detail: created-article',
      }),
    ).toBeInTheDocument();
  });

  it('edit formへ既存Articleを読み込み更新成功後にArticle Detailへ遷移する', async () => {
    const user = userEvent.setup();
    const api = createEditorApi();

    renderEditor({
      api,
      initialPath: '/editor/existing-article',
      slug: 'existing-article',
    });

    expect(await screen.findByLabelText('Title')).toHaveValue('Existing article');
    expect(screen.getByLabelText('Tags')).toHaveValue('react, tdd');

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated article');
    await user.click(screen.getByRole('button', { name: 'Update Article' }));

    expect(api.updateArticle).toHaveBeenCalledWith('existing-article', {
      body: 'Existing body',
      description: 'Existing summary',
      tagList: ['react', 'tdd'],
      title: 'Updated article',
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Article detail: updated-article',
      }),
    ).toBeInTheDocument();
  });

  it('submit中はbuttonをdisabledにして二重送信を防止する', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (article: ArticleEditorArticle) => void = () => {};
    const submitPromise = new Promise<ArticleEditorArticle>((resolve) => {
      resolveSubmit = resolve;
    });
    const api = createEditorApi({
      createArticle: vi.fn().mockReturnValue(submitPromise),
    });

    renderEditor({ api });

    await user.type(screen.getByLabelText('Title'), 'Created article');
    await user.type(screen.getByLabelText('Description'), 'Created summary');
    await user.type(screen.getByLabelText('Body'), 'Created body');
    await user.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(
      screen.getByRole('button', { name: 'Publishing...' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Publishing...' }));
    expect(api.createArticle).toHaveBeenCalledOnce();

    await act(async () => {
      resolveSubmit(CREATED_ARTICLE);
      await submitPromise;
    });
  });

  it('validation errorを表示し入力値を保持する', async () => {
    const user = userEvent.setup();
    const api = createEditorApi({
      createArticle: vi.fn().mockRejectedValue(
        new ApiError('title is too long', {
          bodyErrors: ['title is too long'],
          kind: 'validation',
          status: 422,
        }),
      ),
    });

    renderEditor({ api });

    await user.type(screen.getByLabelText('Title'), 'Draft title');
    await user.type(screen.getByLabelText('Description'), 'Draft summary');
    await user.type(screen.getByLabelText('Body'), 'Draft body');
    await user.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(await screen.findByText('title is too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
      'title is too long',
    );
    expect(screen.getByLabelText('Title')).toHaveValue('Draft title');
    expect(screen.getByLabelText('Description')).toHaveValue('Draft summary');
    expect(screen.getByLabelText('Body')).toHaveValue('Draft body');
  });

  it('required validationはAPIを呼ばずfield errorを表示する', async () => {
    const user = userEvent.setup();
    const api = createEditorApi();

    renderEditor({ api });

    await user.click(screen.getByRole('button', { name: 'Publish Article' }));

    expect(api.createArticle).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
      'title is required',
    );
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription(
      'description is required',
    );
    expect(screen.getByLabelText('Body')).toHaveAccessibleDescription(
      'body is required',
    );
  });

  it('non-author editはforbidden stateを表示し更新を防ぐ', async () => {
    const api = createEditorApi({
      getArticle: vi.fn().mockResolvedValue({
        ...OWN_ARTICLE,
        author: {
          username: 'other-user',
        },
      }),
    });

    renderEditor({
      api,
      currentUsername: 'jake',
      initialPath: '/editor/existing-article',
      slug: 'existing-article',
    });

    expect(
      await screen.findByRole('heading', { name: 'Forbidden' }),
    ).toBeInTheDocument();
    expect(screen.getByText('You cannot edit this article.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update Article' }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(api.updateArticle).not.toHaveBeenCalled();
    });
  });
});
