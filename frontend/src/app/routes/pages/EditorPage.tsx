import { type ReactElement } from 'react';
import { useParams } from 'react-router-dom';

export function EditorPage(): ReactElement {
  const { slug } = useParams();
  const heading = slug ? 'Edit Article' : 'New Article';

  return (
    <main className="page page--narrow">
      <section className="editorial-panel" aria-labelledby="editor-title">
        <h1 id="editor-title">{heading}</h1>
        <form className="form-stack">
          <label>
            <span>Title</span>
            <input placeholder="Article title" type="text" />
          </label>
          <label>
            <span>Description</span>
            <input placeholder="What is this article about?" type="text" />
          </label>
          <label>
            <span>Body</span>
            <textarea placeholder="Write your article" rows={10} />
          </label>
          <label>
            <span>Tags</span>
            <input placeholder="Enter tags" type="text" />
          </label>
          <button className="primary-action" type="button">
            Publish Article
          </button>
        </form>
      </section>
    </main>
  );
}
