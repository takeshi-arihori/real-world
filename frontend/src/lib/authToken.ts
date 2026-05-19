const AUTH_TOKEN_STORAGE_KEY = 'realworld.authToken';

interface AuthTokenStorage {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

function getStorage(): AuthTokenStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function getAuthToken(): string | null {
  return getStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;
}

export function setAuthToken(token: string): void {
  getStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  getStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
