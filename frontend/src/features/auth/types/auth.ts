export interface AuthUser {
  bio: string | null;
  email: string;
  image: string | null;
  username: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
}

export interface UpdateUserInput {
  bio?: string | null;
  email?: string;
  image?: string | null;
  password?: string;
  username?: string;
}

export interface AuthApi {
  getCurrentUser: () => Promise<AuthUser>;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<AuthUser>;
  updateCurrentUser: (input: UpdateUserInput) => Promise<AuthUser>;
}
