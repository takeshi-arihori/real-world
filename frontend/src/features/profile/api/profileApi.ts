import { apiClient, type ApiClient } from '@/lib/apiClient';
import type { Profile } from '../types/profile';

interface ProfileResponse {
  profile: {
    bio: string | null;
    following: boolean;
    image: string | null;
    username: string;
  };
}

/**
 * usernameで指定された公開ProfileをBFF経由で取得する。
 */
export async function getProfile(
  username: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<Profile> {
  const path = buildProfilePath(username);

  if (signal === undefined) {
    return mapProfileResponse(await client.get<ProfileResponse>(path));
  }

  return mapProfileResponse(await client.get<ProfileResponse>(path, { signal }));
}

/**
 * 対象Profileをfollowし、更新後のProfileを返す。
 */
export async function followProfile(
  username: string,
  client: ApiClient = apiClient,
): Promise<Profile> {
  return mapProfileResponse(
    await client.post<ProfileResponse>(`${buildProfilePath(username)}/follow`),
  );
}

/**
 * 対象Profileのfollowを解除し、更新後のProfileを返す。
 */
export async function unfollowProfile(
  username: string,
  client: ApiClient = apiClient,
): Promise<Profile> {
  return mapProfileResponse(
    await client.delete<ProfileResponse>(`${buildProfilePath(username)}/follow`),
  );
}

export function mapProfileResponse(response: ProfileResponse): Profile {
  return {
    bio: response.profile.bio,
    following: response.profile.following,
    image: response.profile.image,
    username: response.profile.username,
  };
}

export function buildProfilePath(username: string): string {
  return `/api/profiles/${encodeURIComponent(username)}`;
}
