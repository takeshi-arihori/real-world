import { createContext } from 'react';
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  UpdateUserInput,
} from '@/features/auth';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isRefreshing: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  updateCurrentUser: (input: UpdateUserInput) => Promise<void>;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
