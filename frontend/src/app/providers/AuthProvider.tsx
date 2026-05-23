import {
  type ReactElement,
  useCallback,
  useEffect,
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
} from '@/features/auth';
import { isApiError } from '@/lib/apiError';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/authToken';
import { AuthContext, type AuthContextValue } from './authContext';

interface AuthProviderProps {
  authApi?: AuthApi;
  children: ReactNode;
  initialUser?: AuthUser | null;
}

/**
 * 認証APIとtoken storageをAuthContextへ接続し、アプリ全体のcurrent User状態を所有する。
 */
export function AuthProvider({
  authApi = defaultAuthApi,
  children,
  initialUser = null,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isRefreshing, setIsRefreshing] = useState(
    () => initialUser === null && hasStoredAuthToken(),
  );

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

  const handleRefreshFailure = useCallback(
    (error: unknown): void => {
      if (isApiError(error) && error.kind === 'unauthorized') {
        logout();
        return;
      }

      setUser(null);
    },
    [logout],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const token = getAuthToken();

    if (token === null || token === '') {
      setUser(null);
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);

    try {
      const session = await authApi.getCurrentUser();

      if (getAuthToken() === token) {
        applySession(session);
      }
    } catch (error: unknown) {
      handleRefreshFailure(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [applySession, authApi, handleRefreshFailure]);

  useEffect(() => {
    const token = getAuthToken();

    if (token === null || token === '') {
      void Promise.resolve().then(() => setIsRefreshing(false));
      return;
    }

    let isCurrent = true;

    async function restoreCurrentUser(): Promise<void> {
      try {
        const session = await authApi.getCurrentUser();

        if (isCurrent && getAuthToken() === token) {
          applySession(session);
        }
      } catch (error: unknown) {
        if (isCurrent) {
          handleRefreshFailure(error);
        }
      } finally {
        if (isCurrent) {
          setIsRefreshing(false);
        }
      }
    }

    void restoreCurrentUser();

    return () => {
      isCurrent = false;
    };
  }, [applySession, authApi, handleRefreshFailure]);

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

/**
 * 保存済みtokenがcurrent User復元を試すべき値かを判定する。
 */
function hasStoredAuthToken(): boolean {
  const token = getAuthToken();

  return token !== null && token !== '';
}
