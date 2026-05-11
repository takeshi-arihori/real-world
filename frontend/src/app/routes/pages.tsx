import type { FormEvent, ReactElement } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/useAuth';
import { getSafeReturnTo } from './returnTo';

const SAMPLE_ARTICLES = [
  {
    author: 'Eric Simons',
    description:
      'This is the description for the post. It gives a brief overview without giving everything away.',
    favoritesCount: 29,
    slug: 'how-to-build-webapps',
    tags: ['programming', 'webdev'],
    title: 'How to build webapps that scale',
  },
  {
    author: 'Jane Doe',
    description:
      'A concise field guide for building calm product interfaces around long-form writing.',
    favoritesCount: 12,
    slug: 'designing-for-reading',
    tags: ['design', 'ux'],
    title: 'Designing for the reading state',
  },
] as const;

const POPULAR_TAGS = [
  'programming',
  'design',
  'react',
  'laravel',
  'architecture',
  'testing',
] as const;

export function HomePage(): ReactElement {
  const { isAuthenticated } = useAuth();

  return (
    <main className="page page--wide">
      <section className="brand-hero" aria-labelledby="home-title">
        <p className="eyebrow">conduit</p>
        <p className="brand-hero__copy">A place to share your knowledge.</p>
      </section>

      <div className="discovery-grid">
        <section className="feed-column" aria-labelledby="home-title">
          <nav className="feed-tabs" aria-label="Feed filters">
            {isAuthenticated ? <button type="button">Your Feed</button> : null}
            <button className="is-active" type="button">
              Global Feed
            </button>
          </nav>
          <h1 id="home-title">Global Feed</h1>

          <div className="article-list">
            {SAMPLE_ARTICLES.map((article) => (
              <article className="article-preview" key={article.slug}>
                <div className="article-preview__meta">
                  <Link to={`/profile/${article.author.toLowerCase().replaceAll(' ', '-')}`}>
                    <span className="avatar" aria-hidden="true">
                      {article.author.charAt(0)}
                    </span>
                    {article.author}
                  </Link>
                  <button className="favorite-button" type="button">
                    {article.favoritesCount}
                  </button>
                </div>
                <Link className="article-preview__body" to={`/article/${article.slug}`}>
                  <h2>{article.title}</h2>
                  <p>{article.description}</p>
                  <div className="article-preview__footer">
                    <span>Read more...</span>
                    <span className="tag-row">
                      {article.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="tag-panel" aria-labelledby="popular-tags-title">
          <h2 id="popular-tags-title">Popular Tags</h2>
          <div className="tag-cloud">
            {POPULAR_TAGS.map((tag) => (
              <Link className="tag" key={tag} to={`/?tag=${tag}`}>
                {tag}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

export function LoginPage(): ReactElement {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    signIn();
    navigate(returnTo, { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/register"
      alternateText="Need an account?"
      heading="Sign in"
      returnTo={returnTo}
      submitLabel="Sign in"
      onSubmit={handleSubmit}
    />
  );
}

export function RegisterPage(): ReactElement {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    signIn();
    navigate('/', { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/login"
      alternateText="Have an account?"
      heading="Sign up"
      submitLabel="Sign up"
      variant="register"
      onSubmit={handleSubmit}
    />
  );
}

interface AuthPageProps {
  alternateHref: string;
  alternateText: string;
  heading: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  returnTo?: string;
  submitLabel: string;
  variant?: 'login' | 'register';
}

function AuthPage({
  alternateHref,
  alternateText,
  heading,
  onSubmit,
  returnTo,
  submitLabel,
  variant = 'login',
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
        <form className="form-stack" onSubmit={onSubmit}>
          {variant === 'register' ? (
            <label>
              <span>Username</span>
              <input autoComplete="username" placeholder="Username" type="text" />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input autoComplete="email" placeholder="Email" type="email" />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete={variant === 'register' ? 'new-password' : 'current-password'}
              placeholder="Password"
              type="password"
            />
          </label>
          <button className="primary-action" type="submit">
            {submitLabel}
          </button>
        </form>
      </section>
    </main>
  );
}

export function SettingsPage(): ReactElement {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    signOut();
    navigate('/', { replace: true });
  }

  return (
    <main className="page page--narrow">
      <section className="editorial-panel" aria-labelledby="settings-title">
        <h1 id="settings-title">Settings</h1>
        <form className="form-stack">
          <label>
            <span>Profile image URL</span>
            <input placeholder="URL of profile picture" type="url" />
          </label>
          <label>
            <span>Username</span>
            <input defaultValue={user?.username ?? ''} type="text" />
          </label>
          <label>
            <span>Bio</span>
            <textarea placeholder="Short bio" rows={5} />
          </label>
          <label>
            <span>Email</span>
            <input placeholder="Email" type="email" />
          </label>
          <label>
            <span>Password</span>
            <input placeholder="New password" type="password" />
          </label>
          <div className="form-actions">
            <button className="primary-action" type="button">
              Update Settings
            </button>
            <button className="danger-action" onClick={handleLogout} type="button">
              Sign out
            </button>
          </div>
        </form>
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
