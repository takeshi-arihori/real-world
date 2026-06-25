import { type ReactElement } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { ArticleDetail } from '@/features/article';

export function ArticleDetailPage(): ReactElement {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();

  if (slug === undefined) {
    return (
      <main className="page page--reading">
        <section className="article-detail" aria-labelledby="article-not-found-title">
          <p className="eyebrow">404</p>
          <h1 id="article-not-found-title">Article not found</h1>
          <p className="article-detail__dek">The article could not be found.</p>
        </section>
      </main>
    );
  }

  function requireAuth(): void {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  function handleDeleted(): void {
    navigate('/', { replace: true });
  }

  return (
    <main className="page page--reading">
      <ArticleDetail
        currentUsername={user?.username ?? null}
        isAuthenticated={isAuthenticated}
        onDeleted={handleDeleted}
        onRequireAuth={requireAuth}
        slug={slug}
      />
    </main>
  );
}
