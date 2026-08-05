import { type ReactElement } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/app/providers/useAuth';
import { ArticleEditor } from '@/features/article';

export function EditorPage(): ReactElement {
  const { slug } = useParams();
  const { user } = useAuth();

  if (user === null) {
    return (
      <main className="page page--narrow">
        <section className="editorial-panel" aria-labelledby="editor-title">
          <h1 id="editor-title">{slug === undefined ? 'New Article' : 'Edit Article'}</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <ArticleEditor
        currentUsername={user.username}
        key={slug ?? 'new'}
        slug={slug}
      />
    </main>
  );
}
