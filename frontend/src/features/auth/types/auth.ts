export interface AuthUser {
  bio: string | null;
  email: string;
  image: string | null;
  username: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
}

export interface AuthApi {
  getCurrentUser: () => Promise<AuthSession>;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  register: (credentials: RegisterCredentials) => Promise<AuthSession>;
}
