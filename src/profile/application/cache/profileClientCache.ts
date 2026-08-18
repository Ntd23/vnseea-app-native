import type { ProfileData } from '../../domain/types/profile.types';

const PROFILE_CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_CLIENT_CACHE_MAX_ENTRIES = 40;

export type ProfilePreviewSeed = {
  id: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  isFollowing?: boolean;
};

export type ProfileClientCacheEntry = {
  data: ProfileData;
  completeness: 'partial' | 'complete';
  includesFriends: boolean;
  expiresAt: number;
};

type LoadProfileDataWithClientCacheInput = {
  viewerId?: string;
  userId: string;
  includeFriends?: boolean;
  force?: boolean;
  load: () => Promise<ProfileData | null>;
};

const profileClientCache = new Map<string, ProfileClientCacheEntry>();
const profileLoadsInFlight = new Map<string, Promise<ProfileData | null>>();

declare global {
  var __VNSEEA_PROFILE_CACHE__:
    | { clear: typeof clearProfileClientCacheForTests }
    | undefined;
}

function profileClientCacheKey(viewerId: string | undefined, userId: string) {
  return `${viewerId ?? 'guest'}:${String(userId)}`;
}

function profileLoadKey(
  viewerId: string | undefined,
  userId: string,
  includeFriends: boolean | undefined,
) {
  return `${profileClientCacheKey(viewerId, userId)}:${
    includeFriends === false ? 'profile-only' : 'with-friends'
  }`;
}

function retainBoundedEntry(key: string, entry: ProfileClientCacheEntry) {
  profileClientCache.delete(key);
  profileClientCache.set(key, entry);

  while (profileClientCache.size > PROFILE_CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = profileClientCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    profileClientCache.delete(oldestKey);
  }
}

export function getProfileClientCacheEntry(
  viewerId: string | undefined,
  userId?: string,
): ProfileClientCacheEntry | null {
  if (!userId) return null;

  const key = profileClientCacheKey(viewerId, userId);
  const entry = profileClientCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    profileClientCache.delete(key);
    return null;
  }

  retainBoundedEntry(key, entry);
  return entry;
}

export function primeProfilePreviewCacheForViewer(
  viewerId: string | undefined,
  seed: ProfilePreviewSeed,
) {
  const key = profileClientCacheKey(viewerId, seed.id);
  const existing = getProfileClientCacheEntry(viewerId, seed.id);
  if (existing?.completeness === 'complete') {
    return;
  }
  const followedByCurrentUser =
    typeof seed.isFollowing === 'boolean'
      ? seed.isFollowing
      : existing?.data.profile?.followedByCurrentUser;
  const followingState =
    typeof seed.isFollowing === 'boolean'
      ? seed.isFollowing
        ? 'following'
        : 'none'
      : existing?.data.profile?.followingState;
  const next: ProfileData = {
    ...existing?.data,
    profile: {
      ...existing?.data.profile,
      id: String(seed.id),
      name: seed.name ?? existing?.data.profile?.name,
      username: seed.username ?? existing?.data.profile?.username,
      avatarUrl: seed.avatarUrl ?? existing?.data.profile?.avatarUrl,
      followingState,
      followedByCurrentUser,
      canFollow:
        typeof seed.isFollowing === 'boolean'
          ? true
          : existing?.data.profile?.canFollow,
    },
    followers: existing?.data.followers ?? [],
    following: existing?.data.following ?? [],
    likedPages: existing?.data.likedPages ?? [],
    joinedGroups: existing?.data.joinedGroups ?? [],
    family: existing?.data.family ?? [],
  };

  retainBoundedEntry(key, {
    data: next,
    completeness: existing?.completeness ?? 'partial',
    includesFriends: existing?.includesFriends ?? false,
    expiresAt: Date.now() + PROFILE_CLIENT_CACHE_TTL_MS,
  });
}

export function setCompleteProfileClientCacheEntry(
  viewerId: string | undefined,
  userId: string | undefined,
  data: ProfileData,
  includesFriends = false,
) {
  if (!userId || !data.profile) return;

  retainBoundedEntry(profileClientCacheKey(viewerId, userId), {
    data,
    completeness: 'complete',
    includesFriends,
    expiresAt: Date.now() + PROFILE_CLIENT_CACHE_TTL_MS,
  });
}

export function updateProfileClientCacheEntry(
  viewerId: string | undefined,
  userId: string | undefined,
  data: ProfileData,
) {
  if (!userId || !data.profile) return;

  const existing = getProfileClientCacheEntry(viewerId, userId);
  retainBoundedEntry(profileClientCacheKey(viewerId, userId), {
    data,
    completeness: existing?.completeness ?? 'partial',
    includesFriends: existing?.includesFriends ?? false,
    expiresAt:
      existing?.completeness === 'complete'
        ? existing.expiresAt
        : Date.now() + PROFILE_CLIENT_CACHE_TTL_MS,
  });
}

export async function loadProfileDataWithClientCache({
  viewerId,
  userId,
  includeFriends,
  force = false,
  load,
}: LoadProfileDataWithClientCacheInput) {
  const cached = getProfileClientCacheEntry(viewerId, userId);
  const cachedSatisfiesRequest =
    cached?.completeness === 'complete' &&
    (includeFriends === false || cached.includesFriends);
  if (!force && cachedSatisfiesRequest) {
    return cached.data;
  }

  const requestKey = profileLoadKey(viewerId, userId, includeFriends);
  const inFlight = profileLoadsInFlight.get(requestKey);
  if (inFlight) return inFlight;

  const request = load()
    .then(result => {
      if (result) {
        setCompleteProfileClientCacheEntry(
          viewerId,
          userId,
          result,
          includeFriends !== false,
        );
      }
      return result;
    })
    .finally(() => {
      if (profileLoadsInFlight.get(requestKey) === request) {
        profileLoadsInFlight.delete(requestKey);
      }
    });
  profileLoadsInFlight.set(requestKey, request);
  return request;
}

export function clearProfileClientCacheForTests() {
  profileClientCache.clear();
  profileLoadsInFlight.clear();
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  globalThis.__VNSEEA_PROFILE_CACHE__ = {
    clear: clearProfileClientCacheForTests,
  };
}
