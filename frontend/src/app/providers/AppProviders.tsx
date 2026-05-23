import type { ReactElement, ReactNode } from 'react';
import type { AuthApi, AuthUser } from '@/features/auth';
import { AuthProvider } from './AuthProvider';

interface AppProvidersProps {
  authApi?: AuthApi;
  children: ReactNode;
  initialUser?: AuthUser | null;
}

/**
 * アプリ全体で共有するProviderを束ね、テストでは認証APIの差し替えを許可する。
 */
export function AppProviders({
  authApi,
  children,
  initialUser = null,
}: AppProvidersProps): ReactElement {
  return (
    <AuthProvider authApi={authApi} initialUser={initialUser}>
      {children}
    </AuthProvider>
  );
}
