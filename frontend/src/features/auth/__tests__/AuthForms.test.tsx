import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/apiError';
import { LoginForm, RegisterForm } from '../index';

describe('auth forms', () => {
  it('submits login credentials and shows the pending state', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(submitPromise);
    const onSuccess = vi.fn();

    render(<LoginForm onSubmit={onSubmit} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), 'jake@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'jake@example.com',
      password: 'secret',
    });
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

    resolveSubmit?.();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('keeps login input values when API validation fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('email is invalid', {
        bodyErrors: ['email is invalid'],
        kind: 'validation',
        status: 422,
      }),
    );

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('email is invalid')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('invalid@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('secret');
  });

  it('submits register credentials and keeps input values when the API rejects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('username has already been taken', {
        bodyErrors: ['username has already been taken'],
        kind: 'validation',
        status: 422,
      }),
    );

    render(<RegisterForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Username'), 'jake');
    await user.type(screen.getByLabelText('Email'), 'jake@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'jake@example.com',
      password: 'secret',
      username: 'jake',
    });
    expect(
      await screen.findByText('username has already been taken'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('jake');
    expect(screen.getByLabelText('Email')).toHaveValue('jake@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('secret');
  });
});
