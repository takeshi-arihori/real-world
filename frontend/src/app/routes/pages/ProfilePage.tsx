import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';

export function ProfilePage(): ReactElement {
  const { username } = useParams();
  const profileName = username ?? 'profile';

  return (
    <main className="page page--wide">
      <section className="profile-header" aria-labelledby="profile-title">
        <span className="avatar avatar--large" aria-hidden="true">
          {profileName.charAt(0).toUpperCase()}
        </span>
        <h1 id="profile-title">{profileName}</h1>
        <button className="secondary-action" type="button">
          Follow {profileName}
        </button>
      </section>
      <section className="feed-column" aria-label="Profile articles">
        <nav className="feed-tabs" aria-label="Profile tabs">
          <button className="is-active" type="button">
            My Articles
          </button>
          <button type="button">Favorited Articles</button>
        </nav>
        <p className="empty-state">Profile article feeds are ready for API integration.</p>
      </section>
    </main>
  );
}
