import { use } from 'react';
import { AuthContext, type AuthContextValue } from './authContext';

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
