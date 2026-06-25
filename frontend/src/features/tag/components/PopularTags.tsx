import { type ReactElement, useEffect, useState } from 'react';
import { getPopularTags } from '../index';

interface PopularTagsProps {
  onSelectTag: (tag: string) => void;
  selectedTag: string | null;
}

type PopularTagsState =
  | {
      error: null;
      status: 'loading';
      tags: [];
    }
  | {
      error: null;
      status: 'success';
      tags: string[];
    }
  | {
      error: string;
      status: 'error';
      tags: [];
    };

export function PopularTags({
  onSelectTag,
  selectedTag,
}: PopularTagsProps): ReactElement {
  const [state, setState] = useState<PopularTagsState>({
    error: null,
    status: 'loading',
    tags: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      try {
        const tags = await getPopularTags(undefined, {
          signal: controller.signal,
        });

        if (!isCurrent) {
          return;
        }

        setState({
          error: null,
          status: 'success',
          tags,
        });
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setState({
          error: 'Tags could not be loaded.',
          status: 'error',
          tags: [],
        });
      }
    }

    void load();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, []);

  return (
    <aside className="tag-panel" aria-labelledby="popular-tags-title">
      <h2 id="popular-tags-title">Popular Tags</h2>
      {renderTagContent(state, selectedTag, onSelectTag)}
    </aside>
  );
}

function renderTagContent(
  state: PopularTagsState,
  selectedTag: string | null,
  onSelectTag: (tag: string) => void,
): ReactElement {
  if (state.status === 'loading') {
    return <p className="state-message state-message--compact">Loading tags...</p>;
  }

  if (state.status === 'error') {
    return (
      <p className="state-message state-message--compact state-message--error">
        {state.error}
      </p>
    );
  }

  if (state.tags.length === 0) {
    return <p className="state-message state-message--compact">No tags yet.</p>;
  }

  return (
    <div className="tag-cloud">
      {state.tags.map((tag) => (
        <button
          className={selectedTag === tag ? 'tag is-active' : 'tag'}
          key={tag}
          onClick={() => onSelectTag(tag)}
          type="button"
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
