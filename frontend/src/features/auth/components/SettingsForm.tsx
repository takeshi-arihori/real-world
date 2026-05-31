import { type FormEvent, type ReactElement, useState } from 'react';
import type { AuthUser, UpdateUserInput } from '../types/auth';
import { getFormErrors } from '../utils/formErrors';

interface SettingsFormProps {
  onLogout: () => Promise<void>;
  onSubmit: (input: UpdateUserInput) => Promise<void>;
  user: AuthUser;
}

/**
 * Settings更新に必要な入力、送信中状態、API error表示を受け持つフォーム。
 */
export function SettingsForm({
  onLogout,
  onSubmit,
  user,
}: SettingsFormProps): ReactElement {
  const [bio, setBio] = useState(user.bio ?? '');
  const [email, setEmail] = useState(user.email);
  const [errors, setErrors] = useState<string[]>([]);
  const [image, setImage] = useState(user.image ?? '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(user.username);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const input = createUpdateInput({
      bio,
      email,
      image,
      password,
      username,
    });
    const validationErrors = validateSettings(input);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      await onSubmit(input);
      setPassword('');
    } catch (error: unknown) {
      setErrors(getFormErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <form className="form-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FormErrorList errors={errors} />
      <label htmlFor="settings-image">
        <span>Profile image URL</span>
        <input
          id="settings-image"
          onChange={(event) => setImage(event.currentTarget.value)}
          placeholder="URL of profile picture"
          type="url"
          value={image}
        />
      </label>
      <label htmlFor="settings-username">
        <span>Username</span>
        <input
          autoComplete="username"
          id="settings-username"
          onChange={(event) => setUsername(event.currentTarget.value)}
          type="text"
          value={username}
        />
      </label>
      <label htmlFor="settings-bio">
        <span>Bio</span>
        <textarea
          id="settings-bio"
          onChange={(event) => setBio(event.currentTarget.value)}
          placeholder="Short bio"
          rows={5}
          value={bio}
        />
      </label>
      <label htmlFor="settings-email">
        <span>Email</span>
        <input
          autoComplete="email"
          id="settings-email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
      </label>
      <label htmlFor="settings-password">
        <span>Password</span>
        <input
          autoComplete="new-password"
          id="settings-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="New password"
          type="password"
          value={password}
        />
      </label>
      <div className="form-actions">
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Updating...' : 'Update Settings'}
        </button>
        <button
          className="danger-action"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          type="button"
        >
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </form>
  );
}

interface SettingsFields {
  bio: string;
  email: string;
  image: string;
  password: string;
  username: string;
}

function createUpdateInput(fields: SettingsFields): UpdateUserInput {
  const input: UpdateUserInput = {
    bio: fields.bio.trim() === '' ? null : fields.bio,
    email: fields.email.trim(),
    image: fields.image.trim() === '' ? null : fields.image.trim(),
    username: fields.username.trim(),
  };

  if (fields.password !== '') {
    input['password'] = fields.password;
  }

  return input;
}

function validateSettings(input: UpdateUserInput): string[] {
  const errors: string[] = [];

  if (input.username === undefined || input.username === '') {
    errors.push('username is required');
  }

  if (input.email === undefined || input.email === '') {
    errors.push('email is required');
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
