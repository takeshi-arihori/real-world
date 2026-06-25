import {
  type FormEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { isApiError } from '@/lib/apiError';
import { editorApi as defaultEditorApi } from '../api/editorApi';
import type {
  ArticleEditorApi,
  ArticleEditorArticle,
  ArticleEditorInput,
} from '../types/editor';

interface ArticleEditorProps {
  currentUsername: string;
  editorApi?: ArticleEditorApi;
  slug?: string;
}

interface ArticleEditorFields {
  body: string;
  description: string;
  tags: string;
  title: string;
}

const ARTICLE_EDITOR_FIELDS = [
  'body',
  'description',
  'tagList',
  'title',
] as const;

type ArticleEditorField = (typeof ARTICLE_EDITOR_FIELDS)[number];
type ArticleEditorFieldErrors = Partial<Record<ArticleEditorField, string[]>>;

interface ArticleEditorErrors {
  fields: ArticleEditorFieldErrors;
  global: string[];
}

type EditorStatus = 'error' | 'forbidden' | 'loading' | 'ready';

/**
 * Article create/edit flowの取得、権限表示、入力、submit状態を所有する。
 */
export function ArticleEditor({
  currentUsername,
  editorApi = defaultEditorApi,
  slug,
}: ArticleEditorProps): ReactElement {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ArticleEditorErrors>(
    createEmptyEditorErrors,
  );
  const [fields, setFields] = useState<ArticleEditorFields>(
    createEmptyEditorFields,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<EditorStatus>(
    slug === undefined ? 'ready' : 'loading',
  );
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const isEditMode = slug !== undefined;
  const heading = getEditorHeading(status, isEditMode);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (slug === undefined) {
      return;
    }

    const articleSlug = slug;
    const controller = new AbortController();
    let isCurrent = true;

    async function loadArticle(): Promise<void> {
      setErrors(createEmptyEditorErrors());
      setStatus('loading');

      try {
        const article = await editorApi.getArticle(articleSlug, {
          signal: controller.signal,
        });

        if (!isCurrent) {
          return;
        }

        if (article.author.username !== currentUsername) {
          setStatus('forbidden');
          return;
        }

        setFields(createFieldsFromArticle(article));
        setStatus('ready');
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setStatus(isApiError(error) && error.kind === 'forbidden' ? 'forbidden' : 'error');
      }
    }

    void loadArticle();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [currentUsername, editorApi, slug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSubmittingRef.current || status !== 'ready') {
      return;
    }

    const input = createArticleEditorInput(fields);
    const validationErrors = validateArticleEditorInput(input);

    if (hasFieldErrors(validationErrors)) {
      setErrors({
        fields: validationErrors,
        global: [],
      });
      return;
    }

    setErrors(createEmptyEditorErrors());
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const article = isEditMode
        ? await editorApi.updateArticle(slug, input)
        : await editorApi.createArticle(input);

      navigate(`/article/${article.slug}`);
    } catch (error: unknown) {
      if (isApiError(error) && error.kind === 'forbidden') {
        setStatus('forbidden');
        return;
      }

      setErrors(createEditorErrorsFromMessages(getEditorFormErrors(error)));
    } finally {
      isSubmittingRef.current = false;

      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  if (status === 'loading') {
    return (
      <section className="editorial-panel" aria-labelledby="editor-title">
        <h1 id="editor-title">{heading}</h1>
        <p className="state-message">Loading article...</p>
      </section>
    );
  }

  if (status === 'forbidden') {
    return (
      <section className="editorial-panel" aria-labelledby="editor-title">
        <h1 id="editor-title">Forbidden</h1>
        <p className="state-message state-message--error">
          You cannot edit this article.
        </p>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="editorial-panel" aria-labelledby="editor-title">
        <h1 id="editor-title">{heading}</h1>
        <p className="state-message state-message--error">
          Article could not be loaded.
        </p>
      </section>
    );
  }

  return (
    <section className="editorial-panel" aria-labelledby="editor-title">
      <h1 id="editor-title">{heading}</h1>
      <EditorForm
        errors={errors}
        fields={fields}
        isEditMode={isEditMode}
        isSubmitting={isSubmitting}
        onChange={setFields}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

interface EditorFormProps {
  errors: ArticleEditorErrors;
  fields: ArticleEditorFields;
  isEditMode: boolean;
  isSubmitting: boolean;
  onChange: (fields: ArticleEditorFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function EditorForm({
  errors,
  fields,
  isEditMode,
  isSubmitting,
  onChange,
  onSubmit,
}: EditorFormProps): ReactElement {
  const submitLabel = getSubmitLabel(isEditMode, isSubmitting);

  return (
    <form className="form-stack" noValidate onSubmit={onSubmit}>
      <FormErrorList errors={errors.global} />
      <div className="form-field">
        <label htmlFor="editor-title-input">Title</label>
        <input
          aria-describedby={getFieldDescribedBy('title', errors.fields)}
          aria-invalid={hasMessages(errors.fields.title) ? true : undefined}
          id="editor-title-input"
          onChange={(event) =>
            onChange({ ...fields, title: event.currentTarget.value })
          }
          placeholder="Article title"
          type="text"
          value={fields.title}
        />
        <FieldError errors={errors.fields.title} id={getFieldErrorId('title')} />
      </div>
      <div className="form-field">
        <label htmlFor="editor-description">Description</label>
        <input
          aria-describedby={getFieldDescribedBy('description', errors.fields)}
          aria-invalid={hasMessages(errors.fields.description) ? true : undefined}
          id="editor-description"
          onChange={(event) =>
            onChange({ ...fields, description: event.currentTarget.value })
          }
          placeholder="What is this article about?"
          type="text"
          value={fields.description}
        />
        <FieldError
          errors={errors.fields.description}
          id={getFieldErrorId('description')}
        />
      </div>
      <div className="form-field">
        <label htmlFor="editor-body">Body</label>
        <textarea
          aria-describedby={getFieldDescribedBy('body', errors.fields)}
          aria-invalid={hasMessages(errors.fields.body) ? true : undefined}
          id="editor-body"
          onChange={(event) =>
            onChange({ ...fields, body: event.currentTarget.value })
          }
          placeholder="Write your article"
          rows={10}
          value={fields.body}
        />
        <FieldError errors={errors.fields.body} id={getFieldErrorId('body')} />
      </div>
      <div className="form-field">
        <label htmlFor="editor-tags">Tags</label>
        <input
          aria-describedby={getFieldDescribedBy('tagList', errors.fields)}
          aria-invalid={hasMessages(errors.fields.tagList) ? true : undefined}
          id="editor-tags"
          onChange={(event) =>
            onChange({ ...fields, tags: event.currentTarget.value })
          }
          placeholder="Enter tags separated by commas"
          type="text"
          value={fields.tags}
        />
        <FieldError
          errors={errors.fields.tagList}
          id={getFieldErrorId('tagList')}
        />
      </div>
      <div className="form-actions">
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function getEditorHeading(status: EditorStatus, isEditMode: boolean): string {
  if (status === 'forbidden') {
    return 'Forbidden';
  }

  return isEditMode ? 'Edit Article' : 'New Article';
}

function getSubmitLabel(isEditMode: boolean, isSubmitting: boolean): string {
  if (isSubmitting) {
    return isEditMode ? 'Updating...' : 'Publishing...';
  }

  return isEditMode ? 'Update Article' : 'Publish Article';
}

function createEmptyEditorFields(): ArticleEditorFields {
  return {
    body: '',
    description: '',
    tags: '',
    title: '',
  };
}

function createFieldsFromArticle(
  article: ArticleEditorArticle,
): ArticleEditorFields {
  return {
    body: article.body,
    description: article.description,
    tags: article.tagList.join(', '),
    title: article.title,
  };
}

function createArticleEditorInput(
  fields: ArticleEditorFields,
): ArticleEditorInput {
  return {
    body: fields.body.trim(),
    description: fields.description.trim(),
    tagList: parseTagList(fields.tags),
    title: fields.title.trim(),
  };
}

function parseTagList(tags: string): string[] {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}

function validateArticleEditorInput(
  input: ArticleEditorInput,
): ArticleEditorFieldErrors {
  const errors: ArticleEditorFieldErrors = {};

  if (input.title === '') {
    errors.title = ['title is required'];
  }

  if (input.description === '') {
    errors.description = ['description is required'];
  }

  if (input.body === '') {
    errors.body = ['body is required'];
  }

  return errors;
}

function createEmptyEditorErrors(): ArticleEditorErrors {
  return {
    fields: {},
    global: [],
  };
}

function createEditorErrorsFromMessages(
  messages: string[],
): ArticleEditorErrors {
  const errors = createEmptyEditorErrors();

  for (const message of messages) {
    const field = findArticleEditorField(message);

    if (field === null) {
      errors.global.push(message);
      continue;
    }

    errors.fields[field] = [...(errors.fields[field] ?? []), message];
  }

  return errors;
}

function findArticleEditorField(message: string): ArticleEditorField | null {
  const normalizedMessage = message.toLowerCase();

  return (
    ARTICLE_EDITOR_FIELDS.find((field) => {
      const normalizedField = field.toLowerCase();

      return (
        normalizedMessage.startsWith(`${normalizedField} `) ||
        normalizedMessage.startsWith(`article.${normalizedField} `)
      );
    }) ?? null
  );
}

function getEditorFormErrors(error: unknown): string[] {
  if (isApiError(error)) {
    return error.bodyErrors.length > 0 ? error.bodyErrors : [error.message];
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ['Something went wrong. Please try again.'];
}

function hasFieldErrors(errors: ArticleEditorFieldErrors): boolean {
  return Object.values(errors).some((messages) => hasMessages(messages));
}

function hasMessages(messages: string[] | undefined): messages is string[] {
  return messages !== undefined && messages.length > 0;
}

function getFieldErrorId(field: ArticleEditorField): string {
  return `editor-${field.toLowerCase()}-error`;
}

function getFieldDescribedBy(
  field: ArticleEditorField,
  errors: ArticleEditorFieldErrors,
): string | undefined {
  return hasMessages(errors[field]) ? getFieldErrorId(field) : undefined;
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
  errors?: string[];
  id: string;
}

function FieldError({ errors, id }: FieldErrorProps): ReactElement | null {
  if (!hasMessages(errors)) {
    return null;
  }

  return (
    <p className="field-error" id={id}>
      {errors.join(' ')}
    </p>
  );
}
