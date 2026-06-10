import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';

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
