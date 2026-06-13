import { type ReactElement, useCallback } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ProfileView, type ProfileTab } from '@/features/profile';

export function ProfilePage(): ReactElement {
  const { username } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileUsername = username ?? '';
  const activeTab = getActiveTab(location.pathname);
  const page = parsePage(searchParams.get('page'));

  const selectPage = useCallback(
    (nextPage: number): void => {
      const nextSearchParams = new URLSearchParams();

      if (nextPage > 1) {
        nextSearchParams.set('page', String(nextPage));
      }

      setSearchParams(nextSearchParams);
    },
    [setSearchParams],
  );

  return (
    <main className="page page--wide">
      <ProfileView
        activeTab={activeTab}
        onPageChange={selectPage}
        page={page}
        username={profileUsername}
      />
    </main>
  );
}

function getActiveTab(pathname: string): ProfileTab {
  return pathname.endsWith('/favorites') ? 'favorited' : 'authored';
}

function parsePage(page: string | null): number {
  if (page === null) {
    return 1;
  }

  const parsedPage = Number.parseInt(page, 10);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}
