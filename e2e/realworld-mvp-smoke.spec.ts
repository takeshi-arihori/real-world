import { expect, test, type Page } from '@playwright/test';

interface Credentials {
  email: string;
  password: string;
  username: string;
}

interface ArticleInput {
  body: string;
  comment: string;
  description: string;
  tags: string;
  title: string;
}

test.describe('RealWorld MVP smoke', () => {
  test('registers, logs in, publishes, comments, and favorites an article', async ({
    page,
  }, testInfo) => {
    const runId = createRunId(testInfo.workerIndex);
    const author = createCredentials('author', runId);
    const reader = createCredentials('reader', runId);
    const article = createArticleInput(runId);

    await register(page, author);
    await signOut(page);
    await login(page, author);
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

    await publishArticle(page, article);
    await expect(page.getByRole('heading', { name: article.title })).toBeVisible();
    await expect(page.getByText(article.body)).toBeVisible();

    await postComment(page, article.comment);
    await expect(page.getByText(article.comment)).toBeVisible();

    const articleUrl = page.url();

    await signOut(page);
    await register(page, reader);
    await page.goto(articleUrl);

    const favoriteButton = page.getByRole('button', {
      name: /Favorite Article \(0\)/,
    });
    await expect(favoriteButton).toBeVisible();
    await favoriteButton.click();

    await expect(
      page.getByRole('button', { name: /Unfavorite Article \(1\)/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

async function register(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  await page.getByLabel('Username').fill(credentials.username);
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
}

async function publishArticle(page: Page, article: ArticleInput): Promise<void> {
  await page.getByRole('link', { name: 'New Article' }).click();
  await expect(page.getByRole('heading', { name: 'New Article' })).toBeVisible();
  await page.getByLabel('Title').fill(article.title);
  await page.getByLabel('Description').fill(article.description);
  await page.getByLabel('Body').fill(article.body);
  await page.getByLabel('Tags').fill(article.tags);
  await page.getByRole('button', { name: 'Publish Article' }).click();
  await expect(page).toHaveURL(/\/article\/[^/]+$/);
}

async function postComment(page: Page, body: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Comment' }).fill(body);
  await page.getByRole('button', { name: 'Post Comment' }).click();
}

function createRunId(workerIndex: number): string {
  return (
    process.env.E2E_RUN_ID ??
    `run-${Date.now().toString(36)}-${workerIndex}`
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 24);
}

function createCredentials(role: 'author' | 'reader', runId: string): Credentials {
  const username = `e2e_${role}_${runId}`.slice(0, 50);

  return {
    email: `${username}@example.test`,
    password: 'Password123!',
    username,
  };
}

function createArticleInput(runId: string): ArticleInput {
  return {
    body: `This article body was created by the E2E smoke test ${runId}.`,
    comment: `E2E smoke comment ${runId}`,
    description: `E2E smoke description ${runId}`,
    tags: `e2e-smoke, ${runId}`,
    title: `E2E Smoke Article ${runId}`,
  };
}
