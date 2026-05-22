import { type FormEvent, type ReactElement, useState } from 'react';
import type { RegisterCredentials } from '../types/auth';
import { getFormErrors } from '../utils/formErrors';

interface RegisterFormProps {
  onSubmit: (credentials: RegisterCredentials) => Promise<void>;
  onSuccess?: () => void;
}

/**
 * Registerに必要な入力、送信中状態、API error表示を受け持つフォーム。
 */
export function RegisterForm({
  onSubmit,
  onSuccess,
}: RegisterFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationErrors = validateRegister({ email, password, username });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      await onSubmit({ email, password, username });
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
      <label htmlFor="register-username">
        <span>Username</span>
        <input
          autoComplete="username"
          id="register-username"
          onChange={(event) => setUsername(event.currentTarget.value)}
          placeholder="Username"
          type="text"
          value={username}
        />
      </label>
      <label htmlFor="register-email">
        <span>Email</span>
        <input
          autoComplete="email"
          id="register-email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
      </label>
      <label htmlFor="register-password">
        <span>Password</span>
        <input
          autoComplete="new-password"
          id="register-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
      </label>
      <button className="primary-action" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}

function validateRegister(credentials: RegisterCredentials): string[] {
  const errors: string[] = [];

  if (credentials.username.trim() === '') {
    errors.push('username is required');
  }

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
