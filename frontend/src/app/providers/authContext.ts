import { createContext } from 'react';
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from '@/features/auth';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isRefreshing: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
