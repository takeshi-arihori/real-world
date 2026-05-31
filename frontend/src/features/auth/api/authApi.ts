import { apiClient, type ApiClient } from '@/lib/apiClient';
import type {
  AuthApi,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  UpdateUserInput,
} from '../types/auth';

interface AuthUserResponse {
  user: {
    bio: string | null;
    email: string;
    image: string | null;
    username: string;
  };
}

/**
 * BFF login endpointへ認証情報を送り、tokenを含まないcurrent Userへ変換する。
 */
export async function loginUser(
  credentials: LoginCredentials,
  client: ApiClient = apiClient,
): Promise<AuthUser> {
  const response = await client.post<AuthUserResponse>(
    '/api/session/login',
    {
      user: credentials,
    },
  );

  return mapAuthUser(response);
}

/**
 * BFF register endpointへ登録情報を送り、tokenを含まないcurrent Userへ変換する。
 */
export async function registerUser(
  credentials: RegisterCredentials,
  client: ApiClient = apiClient,
): Promise<AuthUser> {
  const response = await client.post<AuthUserResponse>(
    '/api/session/register',
    {
      user: credentials,
    },
  );

  return mapAuthUser(response);
}

/**
 * BrowserSession cookieからcurrent Userを復元する。
 */
export async function getCurrentUser(
  client: ApiClient = apiClient,
): Promise<AuthUser> {
  const response = await client.get<AuthUserResponse>('/api/session');

  return mapAuthUser(response);
}

/**
 * Settings画面の入力値をBFF update user endpointへ送る。
 */
export async function updateCurrentUser(
  input: UpdateUserInput,
  client: ApiClient = apiClient,
): Promise<AuthUser> {
  const response = await client.put<AuthUserResponse>('/api/session/user', {
    user: removeUndefinedFields(input),
  });

  return mapAuthUser(response);
}

/**
 * BFF BrowserSessionを破棄する。
 */
export async function logoutUser(client: ApiClient = apiClient): Promise<void> {
  await client.delete<null>('/api/session');
}

export const authApi: AuthApi = {
  getCurrentUser,
  login: loginUser,
  logout: logoutUser,
  register: registerUser,
  updateCurrentUser,
};

function mapAuthUser(response: AuthUserResponse): AuthUser {
  return {
    bio: response.user.bio,
    email: response.user.email,
    image: response.user.image,
    username: response.user.username,
  };
}

function removeUndefinedFields(input: UpdateUserInput): UpdateUserInput {
  const payload: UpdateUserInput = {};

  if (input.bio !== undefined) {
    payload.bio = input.bio;
  }

  if (input.email !== undefined) {
    payload.email = input.email;
  }

  if (input.image !== undefined) {
    payload.image = input.image;
  }

  if (input.password !== undefined && input.password !== '') {
    payload['password'] = input.password;
  }

  if (input.username !== undefined) {
    payload.username = input.username;
  }

  return payload;
}
