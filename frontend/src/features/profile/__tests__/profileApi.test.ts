import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { followProfile, getProfile, unfollowProfile } from '../api/profileApi';

function createClient(): ApiClient {
  return {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
  };
}

const PROFILE_RESPONSE = {
  profile: {
    bio: 'API learner',
    following: false,
    image: 'https://example.com/eric.png',
    username: 'eric',
  },
};

describe('Profile API', () => {
  it('Profileを取得してfrontend modelへ変換する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue(PROFILE_RESPONSE);

    const result = await getProfile('eric', client);

    expect(client.get).toHaveBeenCalledWith('/api/profiles/eric');
    expect(result).toEqual({
      bio: 'API learner',
      following: false,
      image: 'https://example.com/eric.png',
      username: 'eric',
    });
  });

  it('usernameをURL encodeしてProfileを取得する', async () => {
    const client = createClient();
    vi.mocked(client.get).mockResolvedValue({
      profile: {
        ...PROFILE_RESPONSE.profile,
        username: 'space user',
      },
    });

    await getProfile('space user', client);

    expect(client.get).toHaveBeenCalledWith('/api/profiles/space%20user');
  });

  it('followとunfollowを実行し、更新後Profileを返す', async () => {
    const client = createClient();
    vi.mocked(client.post).mockResolvedValue({
      profile: {
        ...PROFILE_RESPONSE.profile,
        following: true,
      },
    });
    vi.mocked(client.delete).mockResolvedValue({
      profile: {
        ...PROFILE_RESPONSE.profile,
        following: false,
      },
    });

    const followed = await followProfile('eric', client);
    const unfollowed = await unfollowProfile('eric', client);

    expect(client.post).toHaveBeenCalledWith('/api/profiles/eric/follow');
    expect(client.delete).toHaveBeenCalledWith('/api/profiles/eric/follow');
    expect(followed.following).toBe(true);
    expect(unfollowed.following).toBe(false);
  });
});
