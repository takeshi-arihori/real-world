import {
  type ReactElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi as defaultAuthApi,
  type AuthApi,
  type AuthSession,
  type AuthUser,
  type LoginCredentials,
  type RegisterCredentials,
} from '../../features/auth';
import { clearAuthToken, getAuthToken, setAuthToken } from '../../lib/authToken';
import { isApiError } from '../../lib/apiError';
import { AuthContext, type AuthContextValue } from './authContext';

interface AuthProviderProps {
  authApi?: AuthApi;
  children: ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({
  authApi = defaultAuthApi,
  children,
  initialUser = null,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const applySession = useCallback((session: AuthSession): void => {
    setAuthToken(session.token);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      applySession(await authApi.login(credentials));
    },
    [applySession, authApi],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      applySession(await authApi.register(credentials));
    },
    [applySession, authApi],
  );

  const logout = useCallback((): void => {
    clearAuthToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const token = getAuthToken();

    if (token === null || token === '') {
      setUser(null);
      return;
    }

    setIsRefreshing(true);

    try {
      applySession(await authApi.getCurrentUser());
    } catch (error: unknown) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        logout();
        return;
      }

      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [applySession, authApi, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      isRefreshing,
      login,
      logout,
      refresh,
      register,
      user,
    }),
    [isRefreshing, login, logout, refresh, register, user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
