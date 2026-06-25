import {
  type FormEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { AuthUser, UpdateUserInput } from '../types/auth';
import { getFormErrors } from '../utils/formErrors';

interface SettingsFormProps {
  onLogout: () => Promise<void>;
  onSubmit: (input: UpdateUserInput) => Promise<void>;
  user: AuthUser;
}

const SETTINGS_FIELDS = [
  'bio',
  'email',
  'image',
  'password',
  'username',
] as const;

type SettingsField = (typeof SETTINGS_FIELDS)[number];
type SettingsFieldErrors = Partial<Record<SettingsField, string[]>>;

interface SettingsFormErrors {
  fields: SettingsFieldErrors;
  global: string[];
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
  const [errors, setErrors] = useState<SettingsFormErrors>(
    () => createEmptySettingsErrors(),
  );
  const [image, setImage] = useState(user.image ?? '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(user.username);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const input = createUpdateInput({
      bio,
      email,
      image,
      password,
      username,
    });
    const validationErrors = validateSettings(input);

    if (hasFieldErrors(validationErrors)) {
      setErrors({
        fields: validationErrors,
        global: [],
      });
      return;
    }

    setErrors(createEmptySettingsErrors());
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await onSubmit(input);
      setPassword('');
    } catch (error: unknown) {
      setErrors(createSettingsErrorsFromMessages(getFormErrors(error)));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  }

  return (
    <form className="form-stack" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FormErrorList errors={errors.global} />
      <div className="form-field">
        <label htmlFor="settings-image">Profile image URL</label>
        <input
          aria-describedby={getFieldDescribedBy('image', errors.fields)}
          aria-invalid={hasMessages(errors.fields.image) ? true : undefined}
          id="settings-image"
          onChange={(event) => setImage(event.currentTarget.value)}
          placeholder="URL of profile picture"
          type="url"
          value={image}
        />
        <FieldError
          errors={errors.fields.image}
          id={getFieldErrorId('image')}
        />
      </div>
      <div className="form-field">
        <label htmlFor="settings-username">Username</label>
        <input
          aria-describedby={getFieldDescribedBy('username', errors.fields)}
          aria-invalid={hasMessages(errors.fields.username) ? true : undefined}
          autoComplete="username"
          id="settings-username"
          onChange={(event) => setUsername(event.currentTarget.value)}
          type="text"
          value={username}
        />
        <FieldError
          errors={errors.fields.username}
          id={getFieldErrorId('username')}
        />
      </div>
      <div className="form-field">
        <label htmlFor="settings-bio">Bio</label>
        <textarea
          aria-describedby={getFieldDescribedBy('bio', errors.fields)}
          aria-invalid={hasMessages(errors.fields.bio) ? true : undefined}
          id="settings-bio"
          onChange={(event) => setBio(event.currentTarget.value)}
          placeholder="Short bio"
          rows={5}
          value={bio}
        />
        <FieldError errors={errors.fields.bio} id={getFieldErrorId('bio')} />
      </div>
      <div className="form-field">
        <label htmlFor="settings-email">Email</label>
        <input
          aria-describedby={getFieldDescribedBy('email', errors.fields)}
          aria-invalid={hasMessages(errors.fields.email) ? true : undefined}
          autoComplete="email"
          id="settings-email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
        <FieldError
          errors={errors.fields.email}
          id={getFieldErrorId('email')}
        />
      </div>
      <div className="form-field">
        <label htmlFor="settings-password">Password</label>
        <input
          aria-describedby={getFieldDescribedBy('password', errors.fields)}
          aria-invalid={hasMessages(errors.fields.password) ? true : undefined}
          autoComplete="new-password"
          id="settings-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="New password"
          type="password"
          value={password}
        />
        <FieldError
          errors={errors.fields.password}
          id={getFieldErrorId('password')}
        />
      </div>
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

function validateSettings(input: UpdateUserInput): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};

  if (input.username === undefined || input.username === '') {
    errors.username = ['username is required'];
  }

  if (input.email === undefined || input.email === '') {
    errors.email = ['email is required'];
  }

  return errors;
}

function createEmptySettingsErrors(): SettingsFormErrors {
  return {
    fields: {},
    global: [],
  };
}

function createSettingsErrorsFromMessages(messages: string[]): SettingsFormErrors {
  const errors = createEmptySettingsErrors();

  for (const message of messages) {
    const field = findSettingsField(message);

    if (field === null) {
      errors.global.push(message);
      continue;
    }

    errors.fields[field] = [...(errors.fields[field] ?? []), message];
  }

  return errors;
}

function findSettingsField(message: string): SettingsField | null {
  const normalizedMessage = message.toLowerCase();

  return (
    SETTINGS_FIELDS.find(
      (field) =>
        normalizedMessage.startsWith(`${field} `) ||
        normalizedMessage.startsWith(`user.${field} `),
    ) ?? null
  );
}

function hasFieldErrors(errors: SettingsFieldErrors): boolean {
  return Object.values(errors).some((messages) => hasMessages(messages));
}

function hasMessages(messages: string[] | undefined): messages is string[] {
  return messages !== undefined && messages.length > 0;
}

function getFieldErrorId(field: SettingsField): string {
  return `settings-${field}-error`;
}

function getFieldDescribedBy(
  field: SettingsField,
  errors: SettingsFieldErrors,
): string | undefined {
  return hasMessages(errors[field]) ? getFieldErrorId(field) : undefined;
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

interface FieldErrorProps {
  errors?: string[];
  id: string;
}

function FieldError({ errors, id }: FieldErrorProps): ReactElement | null {
  if (!hasMessages(errors)) {
    return null;
  }

  return (
    <p className="field-error" id={id}>
      {errors.join(' ')}
    </p>
  );
}
