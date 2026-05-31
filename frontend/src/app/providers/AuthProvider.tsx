import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import {
  authApi as defaultAuthApi,
  type AuthApi,
  type AuthUser,
  type LoginCredentials,
  type RegisterCredentials,
  type UpdateUserInput,
} from '@/features/auth';
import { isApiError } from '@/lib/apiError';
import { AuthContext, type AuthContextValue } from './authContext';

interface AuthProviderProps {
  authApi?: AuthApi;
  children: ReactNode;
  initialUser?: AuthUser | null;
}

/**
 * BFF BrowserSession APIをAuthContextへ接続し、アプリ全体のcurrent User状態を所有する。
 */
export function AuthProvider({
  authApi = defaultAuthApi,
  children,
  initialUser = null,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isRefreshing, setIsRefreshing] = useState(() => initialUser === null);
  const operationIdRef = useRef(0);

  const applyUser = useCallback((currentUser: AuthUser): void => {
    setUser(currentUser);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const operationId = nextOperationId(operationIdRef);
      const currentUser = await authApi.login(credentials);

      if (isCurrentOperation(operationIdRef, operationId)) {
        applyUser(currentUser);
        setIsRefreshing(false);
      }
    },
    [applyUser, authApi],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      const operationId = nextOperationId(operationIdRef);
      const currentUser = await authApi.register(credentials);

      if (isCurrentOperation(operationIdRef, operationId)) {
        applyUser(currentUser);
        setIsRefreshing(false);
      }
    },
    [applyUser, authApi],
  );

  const updateCurrentUser = useCallback(
    async (input: UpdateUserInput): Promise<void> => {
      const operationId = nextOperationId(operationIdRef);
      const currentUser = await authApi.updateCurrentUser(input);

      if (isCurrentOperation(operationIdRef, operationId)) {
        applyUser(currentUser);
      }
    },
    [applyUser, authApi],
  );

  const logout = useCallback(async (): Promise<void> => {
    const operationId = nextOperationId(operationIdRef);

    try {
      await authApi.logout();
    } finally {
      if (isCurrentOperation(operationIdRef, operationId)) {
        setUser(null);
        setIsRefreshing(false);
      }
    }
  }, [authApi]);

  const handleRefreshFailure = useCallback(
    (error: unknown): void => {
      if (isApiError(error) && error.kind === 'unauthorized') {
        setUser(null);
        return;
      }

      setUser(null);
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const operationId = nextOperationId(operationIdRef);
    setIsRefreshing(true);

    try {
      const currentUser = await authApi.getCurrentUser();

      if (isCurrentOperation(operationIdRef, operationId)) {
        applyUser(currentUser);
      }
    } catch (error: unknown) {
      if (isCurrentOperation(operationIdRef, operationId)) {
        handleRefreshFailure(error);
      }
    } finally {
      if (isCurrentOperation(operationIdRef, operationId)) {
        setIsRefreshing(false);
      }
    }
  }, [applyUser, authApi, handleRefreshFailure]);

  useEffect(() => {
    if (initialUser !== null) {
      return;
    }

    let isCurrent = true;
    const operationId = nextOperationId(operationIdRef);

    async function restoreCurrentUser(): Promise<void> {
      try {
        const currentUser = await authApi.getCurrentUser();

        if (isCurrent && isCurrentOperation(operationIdRef, operationId)) {
          applyUser(currentUser);
        }
      } catch (error: unknown) {
        if (isCurrent && isCurrentOperation(operationIdRef, operationId)) {
          handleRefreshFailure(error);
        }
      } finally {
        if (isCurrent && isCurrentOperation(operationIdRef, operationId)) {
          setIsRefreshing(false);
        }
      }
    }

    void restoreCurrentUser();

    return () => {
      isCurrent = false;
    };
  }, [applyUser, authApi, handleRefreshFailure, initialUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      isRefreshing,
      login,
      logout,
      refresh,
      register,
      updateCurrentUser,
      user,
    }),
    [isRefreshing, login, logout, refresh, register, updateCurrentUser, user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

function nextOperationId(ref: MutableRefObject<number>): number {
  ref.current += 1;

  return ref.current;
}

function isCurrentOperation(
  ref: MutableRefObject<number>,
  operationId: number,
): boolean {
  return ref.current === operationId;
}
