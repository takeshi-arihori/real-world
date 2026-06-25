import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { SettingsForm } from '@/features/auth';

export function SettingsPage(): ReactElement {
  const { logout, updateCurrentUser, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    navigate('/', { replace: true });
    await logout();
  }

  if (user === null) {
    return (
      <main className="page page--narrow">
        <section className="editorial-panel" aria-labelledby="settings-title">
          <h1 id="settings-title">Settings</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <section className="editorial-panel" aria-labelledby="settings-title">
        <h1 id="settings-title">Settings</h1>
        <SettingsForm
          onLogout={handleLogout}
          onSubmit={updateCurrentUser}
          user={user}
        />
      </section>
    </main>
  );
}
