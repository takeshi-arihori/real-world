import { type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/providers/useAuth';
import { RegisterForm } from '@/features/auth';
import { AuthPage } from './AuthPage';

export function RegisterPage(): ReactElement {
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleSuccess(): void {
    navigate('/', { replace: true });
  }

  return (
    <AuthPage
      alternateHref="/login"
      alternateText="Have an account?"
      heading="Sign up"
    >
      <RegisterForm onSubmit={register} onSuccess={handleSuccess} />
    </AuthPage>
  );
}
