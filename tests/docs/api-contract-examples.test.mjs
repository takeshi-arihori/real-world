import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiRequirements = readFileSync(
  new URL('../../docs/api-requirements.md', import.meta.url),
  'utf8',
);

test('User example matches the implemented Public API wrapper', () => {
  assert.deepEqual(jsonExampleFor('User'), {
    user: {
      email: 'jake@example.com',
      token: '<jwt-token>',
      username: 'jake',
      bio: null,
      image: null,
    },
  });
});

test('Profile example matches the nullable profile response shape', () => {
  assert.deepEqual(jsonExampleFor('Profile'), {
    profile: {
      username: 'jake',
      bio: null,
      image: null,
      following: false,
    },
  });
});

test('Single Article example matches the backend article resource', () => {
  assert.deepEqual(jsonExampleFor('Single Article'), {
    article: {
      slug: 'how-to-train-your-dragon',
      title: 'How to train your dragon',
      description: 'Ever wonder how?',
      body: 'You have to believe',
      tagList: ['dragons', 'training'],
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      favorited: false,
      favoritesCount: 0,
      author: {
        username: 'jake',
        bio: null,
        image: null,
        following: false,
      },
    },
  });
});

test('Multiple Articles example is the frontend list response shape without body', () => {
  const articlesExample = jsonExampleFor('Multiple Articles');

  assert.deepEqual(articlesExample, {
    articles: [
      {
        slug: 'how-to-train-your-dragon',
        title: 'How to train your dragon',
        description: 'Ever wonder how?',
        tagList: ['dragons', 'training'],
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
        favorited: false,
        favoritesCount: 0,
        author: {
          username: 'jake',
          bio: null,
          image: null,
          following: false,
        },
      },
    ],
    articlesCount: 1,
  });
  assert.equal('body' in articlesExample.articles[0], false);
});

test('Comment examples match the implemented comments wrappers', () => {
  const singleComment = {
    comment: {
      id: 1,
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
      body: 'Nice article',
      author: {
        username: 'bob',
        bio: null,
        image: null,
        following: false,
      },
    },
  };

  assert.deepEqual(jsonExampleFor('Single Comment'), singleComment);
  assert.deepEqual(jsonExampleFor('Multiple Comments'), {
    comments: [singleComment.comment],
  });
});

test('Tags example matches the distinct sorted tag fixture', () => {
  assert.deepEqual(jsonExampleFor('Tags'), {
    tags: ['dragons', 'laravel', 'training'],
  });
});

test('Errors examples use public errors.body messages only', () => {
  const errorsSection = markdownSection('Errors');

  assert.match(errorsSection, /"body": \[\s+"Unauthenticated\."\s+\]/);
  assert.match(errorsSection, /"body": \[\s+"title is required",\s+"body is required"\s+\]/);
  assert.doesNotMatch(errorsSection, /secret|token=|\.env|SELECT \*/i);
});

test('Response contract examples do not contain JWT-looking token values', () => {
  const responseContracts = markdownSection('Response Contracts', 2);

  for (const value of stringValuesInJsonCodeBlocks(responseContracts)) {
    assert.doesNotMatch(value, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  }
});

function jsonExampleFor(heading) {
  const section = markdownSection(heading);
  const jsonBlock = section.match(/```json\n([\s\S]*?)\n```/);

  assert.ok(jsonBlock, `Missing JSON example for ${heading}`);

  return JSON.parse(jsonBlock[1]);
}

function markdownSection(heading, level = 3) {
  const hashes = '#'.repeat(level);
  const nextHeading = new RegExp(`\\n#{1,${level}} `);
  const sectionStart = apiRequirements.indexOf(`${hashes} ${heading}\n`);

  assert.notEqual(sectionStart, -1, `Missing ${hashes} ${heading} section`);

  const bodyStart = sectionStart + `${hashes} ${heading}\n`.length;
  const remaining = apiRequirements.slice(bodyStart);
  const nextHeadingMatch = remaining.match(nextHeading);

  return nextHeadingMatch === null
    ? remaining
    : remaining.slice(0, nextHeadingMatch.index);
}

function stringValuesInJsonCodeBlocks(markdown) {
  const values = [];
  const jsonBlocks = markdown.matchAll(/```json\n([\s\S]*?)\n```/g);

  for (const [, json] of jsonBlocks) {
    collectStringValues(JSON.parse(json), values);
  }

  return values;
}

function collectStringValues(value, values) {
  if (typeof value === 'string') {
    values.push(value);

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, values);
    }

    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStringValues(item, values);
    }
  }
}
