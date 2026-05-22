import type { ReactElement, ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/useAuth';

interface AppShellProps {
  children?: ReactNode;
}

export function AppShell({ children }: AppShellProps): ReactElement {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  function handleSignOut(): void {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__inner">
          <Link className="brand-link" to="/">
            RealWorld
          </Link>
          <nav className="top-nav__links" aria-label="Primary navigation">
            <NavLink to="/">Home</NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/editor">New Article</NavLink>
                <NavLink to="/settings">Settings</NavLink>
                <NavLink to={`/profile/${user?.username ?? 'me'}`}>
                  <span className="avatar avatar--small" aria-hidden="true">
                    {(user?.username ?? 'me').charAt(0).toUpperCase()}
                  </span>
                  Profile
                </NavLink>
                <button className="nav-button" onClick={handleSignOut} type="button">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Sign in</NavLink>
                <NavLink to="/register">Sign up</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      {children ?? <Outlet />}
      <footer className="app-footer">
        <div>
          <Link className="brand-link brand-link--small" to="/">
            RealWorld
          </Link>
          <span>Code and design licensed under MIT.</span>
        </div>
      </footer>
    </div>
  );
}
