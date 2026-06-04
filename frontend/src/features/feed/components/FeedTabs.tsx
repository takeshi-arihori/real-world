import type { ReactElement } from 'react';

export type ActiveFeed = 'global' | 'tag' | 'your';

interface FeedTabsProps {
  activeFeed: ActiveFeed;
  isAuthenticated: boolean;
  onSelectGlobal: () => void;
  onSelectYour: () => void;
  selectedTag: string | null;
}

export function FeedTabs({
  activeFeed,
  isAuthenticated,
  onSelectGlobal,
  onSelectYour,
  selectedTag,
}: FeedTabsProps): ReactElement {
  return (
    <nav className="feed-tabs" aria-label="Feed filters">
      {isAuthenticated ? (
        <button
          className={activeFeed === 'your' ? 'is-active' : undefined}
          onClick={onSelectYour}
          type="button"
        >
          Your Feed
        </button>
      ) : null}
      <button
        className={activeFeed === 'global' ? 'is-active' : undefined}
        onClick={onSelectGlobal}
        type="button"
      >
        Global Feed
      </button>
      {selectedTag !== null ? (
        <button
          className={activeFeed === 'tag' ? 'is-active' : undefined}
          type="button"
        >
          # {selectedTag}
        </button>
      ) : null}
    </nav>
  );
}
