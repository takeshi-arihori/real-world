import { type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { LoginForm } from '@/features/auth';
import { getSafeReturnTo } from '../returnTo';
import { AuthPage } from './AuthPage';

export function LoginPage(): ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

  function handleSuccess(): void {
    navigate(returnTo, { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/register"
      alternateText="Need an account?"
      heading="Sign in"
      returnTo={returnTo}
    >
      <LoginForm onSubmit={login} onSuccess={handleSuccess} />
    </AuthPage>
  );
}
