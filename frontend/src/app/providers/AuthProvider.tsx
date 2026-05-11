import { type ReactElement, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type AuthUser } from './authContext';

const DEMO_USER: AuthUser = {
  image: '',
  username: 'demo-user',
};

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      signIn: () => setUser(DEMO_USER),
      signOut: () => setUser(null),
      user,
    }),
    [user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
