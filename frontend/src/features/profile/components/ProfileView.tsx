import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/providers/useAuth';
import {
  ArticleList,
  listArticles,
  type ArticleListQuery,
  type ArticleListResult,
} from '@/features/article';
import { isApiError } from '@/lib/apiError';
import { followProfile, getProfile, unfollowProfile } from '../api/profileApi';
import type { Profile } from '../types/profile';

export type ProfileTab = 'authored' | 'favorited';

interface ProfileViewProps {
  activeTab: ProfileTab;
  onPageChange: (page: number) => void;
  page: number;
  username: string;
}

type ProfileState =
  | {
      error: null;
      profile: null;
      status: 'loading';
      username: string;
    }
  | {
      error: null;
      profile: Profile;
      status: 'success';
      username: string;
    }
  | {
      error: string;
      profile: null;
      status: 'error';
      username: string;
    }
  | {
      error: null;
      profile: null;
      status: 'not_found';
      username: string;
    };

/**
 * Profile画面のProfile取得、follow操作、article tab表示をまとめる。
 */
export function ProfileView({
  activeTab,
  onPageChange,
  page,
  username,
}: ProfileViewProps): ReactElement {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<ProfileState>({
    error: null,
    profile: null,
    status: 'loading',
    username,
  });
  const [isFollowMutating, setIsFollowMutating] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const currentState = state.username === username ? state : createLoadingState(username);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function load(): Promise<void> {
      try {
        const profile = await getProfile(username, undefined, controller.signal);

        if (!isCurrent) {
          return;
        }

        setState({
          error: null,
          profile,
          status: 'success',
          username,
        });
        setFollowError(null);
      } catch (error: unknown) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        if (isApiError(error) && error.kind === 'not_found') {
          setState({
            error: null,
            profile: null,
            status: 'not_found',
            username,
          });
          return;
        }

        setState({
          error: 'Profile could not be loaded.',
          profile: null,
          status: 'error',
          username,
        });
      }
    }

    void load();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [username]);

  const loadArticles = useCallback(
    (query: ArticleListQuery): Promise<ArticleListResult> => {
      if (activeTab === 'favorited') {
        return listArticles({
          ...query,
          favorited: username,
        });
      }

      return listArticles({
        ...query,
        author: username,
      });
    },
    [activeTab, username],
  );
  const articleListKey = useMemo(
    () => `${username}:${activeTab}:${page}`,
    [activeTab, page, username],
  );

  const handleToggleFollow = useCallback(async (): Promise<void> => {
    if (currentState.status !== 'success') {
      return;
    }

    setIsFollowMutating(true);
    setFollowError(null);

    try {
      const nextProfile = currentState.profile.following
        ? await unfollowProfile(currentState.profile.username)
        : await followProfile(currentState.profile.username);

      setState({
        error: null,
        profile: nextProfile,
        status: 'success',
        username,
      });
    } catch {
      setFollowError('Follow state could not be updated.');
    } finally {
      setIsFollowMutating(false);
    }
  }, [currentState, username]);

  if (currentState.status === 'loading') {
    return (
      <section className="profile-header" aria-live="polite">
        <p className="state-message">Loading profile...</p>
      </section>
    );
  }

  if (currentState.status === 'not_found') {
    return (
      <section className="not-found" aria-labelledby="profile-not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="profile-not-found-title">Profile not found</h1>
        <p>The profile could not be found.</p>
        <Link className="primary-action" to="/">
          Go home
        </Link>
      </section>
    );
  }

  if (currentState.status === 'error') {
    return (
      <section className="profile-header" aria-live="polite">
        <p className="state-message state-message--error">{currentState.error}</p>
      </section>
    );
  }

  const currentUsername = user?.username ?? null;

  return (
    <>
      <ProfileHeader
        currentUsername={currentUsername}
        followError={followError}
        isAuthenticated={isAuthenticated}
        isFollowMutating={isFollowMutating}
        onToggleFollow={handleToggleFollow}
        profile={currentState.profile}
      />
      <section className="feed-column" aria-label="Profile articles">
        <ProfileTabs activeTab={activeTab} username={currentState.profile.username} />
        <ArticleList
          key={articleListKey}
          loadArticles={loadArticles}
          onPageChange={onPageChange}
          page={page}
        />
      </section>
    </>
  );
}

interface ProfileHeaderProps {
  currentUsername: string | null;
  followError: string | null;
  isAuthenticated: boolean;
  isFollowMutating: boolean;
  onToggleFollow: () => void;
  profile: Profile;
}

function ProfileHeader({
  currentUsername,
  followError,
  isAuthenticated,
  isFollowMutating,
  onToggleFollow,
  profile,
}: ProfileHeaderProps): ReactElement {
  const isOwnProfile = currentUsername === profile.username;

  return (
    <section className="profile-header" aria-labelledby="profile-title">
      <ProfileAvatar image={profile.image} username={profile.username} />
      <h1 id="profile-title">{profile.username}</h1>
      {profile.bio !== null && profile.bio.trim() !== '' ? (
        <p className="profile-header__bio">{profile.bio}</p>
      ) : null}
      <div className="profile-header__actions">
        {isOwnProfile ? (
          <Link className="secondary-action" to="/settings">
            Edit Profile Settings
          </Link>
        ) : null}
        {!isOwnProfile && isAuthenticated ? (
          <button
            aria-pressed={profile.following}
            className={profile.following ? 'secondary-action is-active' : 'secondary-action'}
            disabled={isFollowMutating}
            onClick={onToggleFollow}
            type="button"
          >
            {profile.following ? 'Unfollow' : 'Follow'} {profile.username}
          </button>
        ) : null}
      </div>
      {followError !== null ? (
        <p className="state-message state-message--compact state-message--error" role="alert">
          {followError}
        </p>
      ) : null}
    </section>
  );
}

interface ProfileAvatarProps {
  image: string | null;
  username: string;
}

function ProfileAvatar({ image, username }: ProfileAvatarProps): ReactElement {
  const imageUrl = image?.trim();

  return (
    <span className="avatar avatar--large" aria-hidden="true">
      {imageUrl !== undefined && imageUrl !== '' ? (
        <img alt="" src={imageUrl} />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </span>
  );
}

interface ProfileTabsProps {
  activeTab: ProfileTab;
  username: string;
}

function ProfileTabs({ activeTab, username }: ProfileTabsProps): ReactElement {
  const profilePath = `/profile/${encodeURIComponent(username)}`;

  return (
    <nav className="feed-tabs" aria-label="Profile tabs">
      <Link
        aria-current={activeTab === 'authored' ? 'page' : undefined}
        className={activeTab === 'authored' ? 'is-active' : undefined}
        to={profilePath}
      >
        My Articles
      </Link>
      <Link
        aria-current={activeTab === 'favorited' ? 'page' : undefined}
        className={activeTab === 'favorited' ? 'is-active' : undefined}
        to={`${profilePath}/favorites`}
      >
        Favorited Articles
      </Link>
    </nav>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function createLoadingState(username: string): ProfileState {
  return {
    error: null,
    profile: null,
    status: 'loading',
    username,
  };
}
