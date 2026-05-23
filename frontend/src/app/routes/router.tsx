import {
  createBrowserRouter,
  createMemoryRouter,
  type DataRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { GuestOnly, RequireAuth } from './guards';
import {
  ArticleDetailPage,
  EditorPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  ProfilePage,
  RegisterPage,
  SettingsPage,
} from './pages';

function createRoutes(): RouteObject[] {
  return [
    {
      children: [
        {
          element: <HomePage />,
          index: true,
        },
        {
          element: (
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          ),
          path: 'login',
        },
        {
          element: (
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          ),
          path: 'register',
        },
        {
          element: (
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          ),
          path: 'settings',
        },
        {
          element: (
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          ),
          path: 'editor',
        },
        {
          element: (
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          ),
          path: 'editor/:slug',
        },
        {
          element: <ArticleDetailPage />,
          path: 'article/:slug',
        },
        {
          element: <ProfilePage />,
          path: 'profile/:username',
        },
        {
          element: <ProfilePage />,
          path: 'profile/:username/favorites',
        },
        {
          element: <NotFoundPage />,
          path: '*',
        },
      ],
      element: <AppShell />,
      path: '/',
    },
  ];
}

export function createAppRouter(initialEntries?: InitialEntry[]): DataRouter {
  const routes = createRoutes();

  if (initialEntries === undefined) {
    return createBrowserRouter(routes);
  }

  return createMemoryRouter(routes, { initialEntries });
}
