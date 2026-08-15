import { type ReactElement, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/app/providers/useAuth';
import {
  ArticleList,
  listArticles,
  type ArticleListQuery,
  type ArticleListResult,
} from '@/features/article';
import { FeedTabs, getFeed, type ActiveFeed } from '@/features/feed';
import { PopularTags } from '@/features/tag';

export function HomePage(): ReactElement {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = normalizeTag(searchParams.get('tag'));
  const page = parsePage(searchParams.get('page'));
  const activeFeed = getActiveFeed({
    feedParam: searchParams.get('feed'),
    isAuthenticated,
    selectedTag,
  });
  const articleListKey = `${activeFeed}:${selectedTag ?? ''}:${page}`;
  const heading = getFeedHeading(activeFeed, selectedTag);

  const loadArticles = useCallback(
    (query: ArticleListQuery): Promise<ArticleListResult> => {
      if (activeFeed === 'your') {
        return getFeed(query);
      }

      if (activeFeed === 'tag') {
        return listArticles({
          ...query,
          tag: selectedTag ?? undefined,
        });
      }

      return listArticles(query);
    },
    [activeFeed, selectedTag],
  );

  const selectGlobalFeed = useCallback((): void => {
    setSearchParams(createHomeSearchParams({ activeFeed: 'global', page: 1 }));
  }, [setSearchParams]);

  const selectYourFeed = useCallback((): void => {
    setSearchParams(createHomeSearchParams({ activeFeed: 'your', page: 1 }));
  }, [setSearchParams]);

  const selectTag = useCallback(
    (tag: string): void => {
      setSearchParams(createHomeSearchParams({ activeFeed: 'tag', page: 1, tag }));
    },
    [setSearchParams],
  );

  const selectPage = useCallback(
    (nextPage: number): void => {
      setSearchParams(
        createHomeSearchParams({
          activeFeed,
          page: nextPage,
          tag: selectedTag,
        }),
      );
    },
    [activeFeed, selectedTag, setSearchParams],
  );

  return (
    <main className="page page--wide">
      <section className="brand-hero" aria-labelledby="home-title">
        <p className="eyebrow">Blog Service</p>
        <p className="brand-hero__copy">A place to share your knowledge.</p>
      </section>

      <div className="discovery-grid">
        <section className="feed-column" aria-labelledby="home-title">
          <FeedTabs
            activeFeed={activeFeed}
            isAuthenticated={isAuthenticated}
            onSelectGlobal={selectGlobalFeed}
            onSelectYour={selectYourFeed}
            selectedTag={selectedTag}
          />
          <h1 id="home-title">{heading}</h1>
          <ArticleList
            key={articleListKey}
            loadArticles={loadArticles}
            onPageChange={selectPage}
            page={page}
          />
        </section>

        <PopularTags onSelectTag={selectTag} selectedTag={selectedTag} />
      </div>
    </main>
  );
}

function normalizeTag(tag: string | null): string | null {
  const normalizedTag = tag?.trim();

  if (normalizedTag === undefined || normalizedTag === '') {
    return null;
  }

  return normalizedTag;
}

function parsePage(page: string | null): number {
  if (page === null) {
    return 1;
  }

  const parsedPage = Number.parseInt(page, 10);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function getActiveFeed({
  feedParam,
  isAuthenticated,
  selectedTag,
}: {
  feedParam: string | null;
  isAuthenticated: boolean;
  selectedTag: string | null;
}): ActiveFeed {
  if (selectedTag !== null) {
    return 'tag';
  }

  if (feedParam === 'your' && isAuthenticated) {
    return 'your';
  }

  return 'global';
}

function getFeedHeading(activeFeed: ActiveFeed, selectedTag: string | null): string {
  if (activeFeed === 'your') {
    return 'Your Feed';
  }

  if (activeFeed === 'tag') {
    return `# ${selectedTag ?? ''}`;
  }

  return 'Global Feed';
}

function createHomeSearchParams({
  activeFeed,
  page,
  tag,
}: {
  activeFeed: ActiveFeed;
  page: number;
  tag?: string | null;
}): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (activeFeed === 'your') {
    searchParams.set('feed', 'your');
  }

  if (activeFeed === 'tag' && tag !== undefined && tag !== null && tag.trim() !== '') {
    searchParams.set('tag', tag);
  }

  if (page > 1) {
    searchParams.set('page', String(page));
  }

  return searchParams;
}
