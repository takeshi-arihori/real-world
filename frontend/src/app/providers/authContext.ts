import { createContext } from 'react';

export interface AuthUser {
  image: string;
  username: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
