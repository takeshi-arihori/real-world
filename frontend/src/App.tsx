import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { createAppRouter } from '@/app/routes/router';

const router = createAppRouter();

export function App(): ReactElement {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
