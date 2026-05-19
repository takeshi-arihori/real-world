const AUTH_TOKEN_STORAGE_KEY = 'realworld.authToken';

interface AuthTokenStorage {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

/**
 * SSRやテスト環境でwindowがない場合にtoken storageへ触らないようにする。
 */
function getStorage(): AuthTokenStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

/**
 * API clientが送信時点の認証トークンを取得する。
 */
export function getAuthToken(): string | null {
  return getStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;
}

/**
 * login/register成功後にRealWorld API tokenを保存する。
 */
export function setAuthToken(token: string): void {
  getStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

/**
 * logoutやinvalid token検出時に保存済み認証トークンを削除する。
 */
export function clearAuthToken(): void {
  getStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
