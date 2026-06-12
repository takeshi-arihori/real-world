import { describe, expect, it } from 'vitest';
import { ArticleDetailPage } from '../pages/ArticleDetailPage';
import { EditorPage } from '../pages/EditorPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { SettingsPage } from '../pages/SettingsPage';

describe('route Page modules', () => {
  it('Page componentを専用moduleから公開する', () => {
    expect(HomePage).toBeTypeOf('function');
    expect(LoginPage).toBeTypeOf('function');
    expect(RegisterPage).toBeTypeOf('function');
    expect(SettingsPage).toBeTypeOf('function');
    expect(EditorPage).toBeTypeOf('function');
    expect(ArticleDetailPage).toBeTypeOf('function');
    expect(ProfilePage).toBeTypeOf('function');
    expect(NotFoundPage).toBeTypeOf('function');
  });
});
