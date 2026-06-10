import { type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthPageProps {
  alternateHref: string;
  alternateText: string;
  children: ReactNode;
  heading: string;
  returnTo?: string;
}

export function AuthPage({
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
