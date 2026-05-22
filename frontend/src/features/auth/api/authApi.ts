import { apiClient, type ApiClient } from '../../../lib/apiClient';
import type {
  AuthApi,
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth';

interface AuthUserResponse {
  user: {
    bio: string | null;
    email: string;
    image: string | null;
    token: string;
    username: string;
  };
}

/**
 * RealWorld login endpointへ認証情報を送り、UI向けのAuthSessionへ変換する。
 */
export async function loginUser(
  credentials: LoginCredentials,
  client: ApiClient = apiClient,
): Promise<AuthSession> {
  const response = await client.post<AuthUserResponse>('/api/users/login', {
    user: credentials,
  });

  return mapAuthSession(response);
}

/**
 * RealWorld register endpointへ登録情報を送り、UI向けのAuthSessionへ変換する。
 */
export async function registerUser(
  credentials: RegisterCredentials,
  client: ApiClient = apiClient,
): Promise<AuthSession> {
  const response = await client.post<AuthUserResponse>('/api/users', {
    user: credentials,
  });

  return mapAuthSession(response);
}

/**
 * 保存済みtokenでcurrent Userを取得し、Providerが扱うAuthSessionへ変換する。
 */
export async function getCurrentUser(
  client: ApiClient = apiClient,
): Promise<AuthSession> {
  const response = await client.get<AuthUserResponse>('/api/user');

  return mapAuthSession(response);
}

export const authApi: AuthApi = {
  getCurrentUser,
  login: loginUser,
  register: registerUser,
};

function mapAuthSession(response: AuthUserResponse): AuthSession {
  return {
    token: response.user.token,
    user: mapAuthUser(response),
  };
}

function mapAuthUser(response: AuthUserResponse): AuthUser {
  return {
    bio: response.user.bio,
    email: response.user.email,
    image: response.user.image,
    username: response.user.username,
  };
}
