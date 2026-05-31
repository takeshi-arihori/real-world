import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiError';
import { LoginForm, RegisterForm, SettingsForm } from '../index';

describe('認証フォーム', () => {
  it('ログイン認証情報を送信し送信中状態を表示する', async () => {
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

  it('ログインAPI validationが失敗しても入力値を保持する', async () => {
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

  it('登録認証情報を送信しAPI拒否時も入力値を保持する', async () => {
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

  it('settings formは現在のユーザー値を初期表示して更新内容を送信する', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsForm
        onLogout={onLogout}
        onSubmit={onSubmit}
        user={{
          bio: 'API learner',
          email: 'jake@example.com',
          image: 'https://example.com/avatar.png',
          username: 'jake',
        }}
      />,
    );

    expect(screen.getByLabelText('Username')).toHaveValue('jake');
    expect(screen.getByLabelText('Bio')).toHaveValue('API learner');

    await user.clear(screen.getByLabelText('Bio'));
    await user.type(screen.getByLabelText('Bio'), 'Conduit writer');
    await user.clear(screen.getByLabelText('Password'));
    await user.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(onSubmit).toHaveBeenCalledWith({
      bio: 'Conduit writer',
      email: 'jake@example.com',
      image: 'https://example.com/avatar.png',
      username: 'jake',
    });
  });

  it('settings updateのAPI validationが失敗しても入力値を保持する', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('email is invalid', {
        bodyErrors: ['email is invalid'],
        kind: 'validation',
        status: 422,
      }),
    );

    render(
      <SettingsForm
        onLogout={vi.fn().mockResolvedValue(undefined)}
        onSubmit={onSubmit}
        user={{
          bio: null,
          email: 'jake@example.com',
          image: null,
          username: 'jake',
        }}
      />,
    );

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
    await user.click(screen.getByRole('button', { name: 'Update Settings' }));

    expect(await screen.findByText('email is invalid')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('invalid@example.com');
  });
});
