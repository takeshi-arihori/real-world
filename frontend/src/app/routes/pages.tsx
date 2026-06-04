import { type ReactElement, type ReactNode, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import {
  ArticleList,
  listArticles,
  type ArticleListQuery,
  type ArticleListResult,
} from '@/features/article';
import { LoginForm, RegisterForm, SettingsForm } from '@/features/auth';
import { FeedTabs, getFeed, type ActiveFeed } from '@/features/feed';
import { PopularTags } from '@/features/tag';
import { getSafeReturnTo } from './returnTo';

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
        <p className="eyebrow">conduit</p>
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

export function LoginPage(): ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

  function handleSuccess(): void {
    navigate(returnTo, { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/register"
      alternateText="Need an account?"
      heading="Sign in"
      returnTo={returnTo}
    >
      <LoginForm onSubmit={login} onSuccess={handleSuccess} />
    </AuthPage>
  );
}

export function RegisterPage(): ReactElement {
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleSuccess(): void {
    navigate('/', { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/login"
      alternateText="Have an account?"
      heading="Sign up"
    >
      <RegisterForm onSubmit={register} onSuccess={handleSuccess} />
    </AuthPage>
  );
}

interface AuthPageProps {
  alternateHref: string;
  alternateText: string;
  children: ReactNode;
  heading: string;
  returnTo?: string;
}

function AuthPage({
  alternateHref,
  alternateText,
  children,
  heading,
  returnTo,
}: AuthPageProps): ReactElement {
  return (
    <main className="page page--centered">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel__header">
          <h1 id="auth-title">{heading}</h1>
          <Link to={alternateHref}>{alternateText}</Link>
        </div>
        {returnTo && returnTo !== '/' ? (
          <p className="route-note">
            Sign in to continue to <strong>{returnTo}</strong>
          </p>
        ) : null}
        {children}
      </section>
    </main>
  );
}

export function SettingsPage(): ReactElement {
  const { logout, updateCurrentUser, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    navigate('/', { replace: true });
    await logout();
  }

  if (user === null) {
    return (
      <main className="page page--narrow">
        <section className="editorial-panel" aria-labelledby="settings-title">
          <h1 id="settings-title">Settings</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <section className="editorial-panel" aria-labelledby="settings-title">
        <h1 id="settings-title">Settings</h1>
        <SettingsForm
          onLogout={handleLogout}
          onSubmit={updateCurrentUser}
          user={user}
        />
      </section>
    </main>
  );
}

export function EditorPage(): ReactElement {
  const { slug } = useParams();
  const heading = slug ? 'Edit Article' : 'New Article';

  return (
    <main className="page page--narrow">
      <section className="editorial-panel" aria-labelledby="editor-title">
        <h1 id="editor-title">{heading}</h1>
        <form className="form-stack">
          <label>
            <span>Title</span>
            <input placeholder="Article title" type="text" />
          </label>
          <label>
            <span>Description</span>
            <input placeholder="What is this article about?" type="text" />
          </label>
          <label>
            <span>Body</span>
            <textarea placeholder="Write your article" rows={10} />
          </label>
          <label>
            <span>Tags</span>
            <input placeholder="Enter tags" type="text" />
          </label>
          <button className="primary-action" type="button">
            Publish Article
          </button>
        </form>
      </section>
    </main>
  );
}

export function ArticleDetailPage(): ReactElement {
  const { slug } = useParams();

  return (
    <main className="page page--reading">
      <article className="article-detail">
        <p className="eyebrow">Article</p>
        <h1>{slug === undefined ? 'Article Detail' : readableSlug(slug)}</h1>
        <p className="article-detail__dek">
          This route is ready for the Publishing Context implementation. Article
          data, favorite state, comments, and author commands will be connected
          by the follow-up issues.
        </p>
        <div className="tag-row">
          <span className="tag">react</span>
          <span className="tag">realworld</span>
        </div>
      </article>
    </main>
  );
}

export function ProfilePage(): ReactElement {
  const { username } = useParams();
  const profileName = username ?? 'profile';

  return (
    <main className="page page--wide">
      <section className="profile-header" aria-labelledby="profile-title">
        <span className="avatar avatar--large" aria-hidden="true">
          {profileName.charAt(0).toUpperCase()}
        </span>
        <h1 id="profile-title">{profileName}</h1>
        <button className="secondary-action" type="button">
          Follow {profileName}
        </button>
      </section>
      <section className="feed-column" aria-label="Profile articles">
        <nav className="feed-tabs" aria-label="Profile tabs">
          <button className="is-active" type="button">
            My Articles
          </button>
          <button type="button">Favorited Articles</button>
        </nav>
        <p className="empty-state">Profile article feeds are ready for API integration.</p>
      </section>
    </main>
  );
}

export function NotFoundPage(): ReactElement {
  return (
    <main className="page page--centered">
      <section className="not-found" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The route does not exist in the RealWorld MVP shell.</p>
        <Link className="primary-action" to="/">
          Go home
        </Link>
      </section>
    </main>
  );
}

function readableSlug(slug: string): string {
  return slug
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
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
