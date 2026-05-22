import { type FormEvent, type ReactElement, useState } from 'react';
import type { LoginCredentials } from '../types/auth';
import { getFormErrors } from '../utils/formErrors';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  onSuccess?: () => void;
}

/**
 * Loginに必要な入力、送信中状態、API error表示を受け持つフォーム。
 */
export function LoginForm({
  onSubmit,
  onSuccess,
}: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationErrors = validateLogin({ email, password });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      await onSubmit({ email, password });
      onSuccess?.();
    } catch (error: unknown) {
      setErrors(getFormErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FormErrorList errors={errors} />
      <label htmlFor="login-email">
        <span>Email</span>
        <input
          autoComplete="email"
          id="login-email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
      </label>
      <label htmlFor="login-password">
        <span>Password</span>
        <input
          autoComplete="current-password"
          id="login-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
      </label>
      <button className="primary-action" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}

function validateLogin(credentials: LoginCredentials): string[] {
  const errors: string[] = [];

  if (credentials.email.trim() === '') {
    errors.push('email is required');
  }

  if (credentials.password === '') {
    errors.push('password is required');
  }

  return errors;
}

interface FormErrorListProps {
  errors: string[];
}

function FormErrorList({ errors }: FormErrorListProps): ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul className="form-errors" role="alert">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
