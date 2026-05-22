import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import type { AuthApi, AuthUser } from '../../features/auth';

interface AppProvidersProps {
  authApi?: AuthApi;
  children: ReactNode;
  initialUser?: AuthUser | null;
}

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
