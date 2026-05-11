import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import type { AuthUser } from './authContext';

interface AppProvidersProps {
  children: ReactNode;
  initialUser?: AuthUser | null;
}

export function AppProviders({
  children,
  initialUser = null,
}: AppProvidersProps): ReactElement {
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>;
}
