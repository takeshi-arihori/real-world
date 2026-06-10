import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';

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

function readableSlug(slug: string): string {
  return slug
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
