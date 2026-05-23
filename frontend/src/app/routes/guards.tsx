import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { getSafeReturnTo } from './returnTo';

interface GuardProps {
  children: ReactNode;
}

/**
 * 認証必須ルートでcurrent User確認が終わるまでredirect判定を保留する。
 */
export function RequireAuth({ children }: GuardProps): ReactElement | null {
  const { isAuthenticated, isRefreshing } = useAuth();
  const location = useLocation();

  if (isRefreshing) {
    return null;
  }

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

/**
 * ゲスト専用ルートでcurrent User確認が終わるまでredirect判定を保留する。
 */
export function GuestOnly({ children }: GuardProps): ReactElement | null {
  const { isAuthenticated, isRefreshing } = useAuth();
  const location = useLocation();

  if (isRefreshing) {
    return null;
  }

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

    return <Navigate replace to={returnTo} />;
  }

  return <>{children}</>;
}
