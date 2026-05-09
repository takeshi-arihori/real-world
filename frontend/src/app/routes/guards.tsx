import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/useAuth';

interface GuardProps {
  children: ReactNode;
}

export function RequireAuth({ children }: GuardProps): ReactElement {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;

    return (
      <Navigate
        replace
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
      />
    );
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: GuardProps): ReactElement {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

    return <Navigate replace to={returnTo} />;
  }

  return <>{children}</>;
}

function getSafeReturnTo(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}
