import type { ProfileData } from '../../../domain/types/profile.types';
import {
  clearProfileClientCacheForTests,
  getProfileClientCacheEntry,
  loadProfileDataWithClientCache,
  primeProfilePreviewCacheForViewer,
  setCompleteProfileClientCacheEntry,
  updateProfileClientCacheEntry,
} from '../profileClientCache';

function completeProfile(id: string, name: string): ProfileData {
  return {
    profile: { id, name, username: name.toLowerCase() },
    followers: [],
    following: [],
    likedPages: [],
    joinedGroups: [],
    family: [],
  };
}

describe('profileClientCache', () => {
  beforeEach(() => {
    clearProfileClientCacheForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('primes an incomplete profile shell from a Feed publisher summary', () => {
    primeProfilePreviewCacheForViewer('viewer-1', {
      id: 'user-2',
      name: 'Lan',
      username: 'lan',
      avatarUrl: 'https://cdn.example/lan.jpg',
      isFollowing: true,
    });

    expect(getProfileClientCacheEntry('viewer-1', 'user-2')).toMatchObject({
      completeness: 'partial',
      data: {
        profile: {
          id: 'user-2',
          name: 'Lan',
          username: 'lan',
          avatarUrl: 'https://cdn.example/lan.jpg',
          followingState: 'following',
          followedByCurrentUser: true,
        },
      },
    });
  });

  it('uses a fresh complete entry without loading profile metadata again', async () => {
    const cached = completeProfile('user-2', 'Cached Lan');
    setCompleteProfileClientCacheEntry('viewer-1', 'user-2', cached);
    const load = jest.fn(async () => completeProfile('user-2', 'Network Lan'));

    await expect(
      loadProfileDataWithClientCache({
        viewerId: 'viewer-1',
        userId: 'user-2',
        includeFriends: false,
        load,
      }),
    ).resolves.toBe(cached);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not reuse profile-only metadata for a request that includes friends', async () => {
    setCompleteProfileClientCacheEntry(
      'viewer-1',
      'user-2',
      completeProfile('user-2', 'Cached Lan'),
      false,
    );
    const withFriends = {
      ...completeProfile('user-2', 'Network Lan'),
      followers: [{ id: 'follower-1', name: 'Mai' }],
    };
    const load = jest.fn(async () => withFriends);

    await expect(
      loadProfileDataWithClientCache({
        viewerId: 'viewer-1',
        userId: 'user-2',
        includeFriends: true,
        load,
      }),
    ).resolves.toBe(withFriends);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads an incomplete entry and deduplicates concurrent requests', async () => {
    primeProfilePreviewCacheForViewer('viewer-1', {
      id: 'user-2',
      name: 'Feed Lan',
    });
    let resolveLoad: ((value: ProfileData) => void) | undefined;
    const load = jest.fn(
      () =>
        new Promise<ProfileData>(resolve => {
          resolveLoad = resolve;
        }),
    );

    const first = loadProfileDataWithClientCache({
      viewerId: 'viewer-1',
      userId: 'user-2',
      includeFriends: false,
      load,
    });
    const second = loadProfileDataWithClientCache({
      viewerId: 'viewer-1',
      userId: 'user-2',
      includeFriends: false,
      load,
    });
    resolveLoad?.(completeProfile('user-2', 'Network Lan'));

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({
        profile: expect.objectContaining({ name: 'Network Lan' }),
      }),
      expect.objectContaining({
        profile: expect.objectContaining({ name: 'Network Lan' }),
      }),
    ]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(getProfileClientCacheEntry('viewer-1', 'user-2')?.completeness).toBe(
      'complete',
    );
  });

  it('forces an explicit refresh even when a complete entry is fresh', async () => {
    setCompleteProfileClientCacheEntry(
      'viewer-1',
      'user-2',
      completeProfile('user-2', 'Cached Lan'),
    );
    const refreshed = completeProfile('user-2', 'Fresh Lan');
    const load = jest.fn(async () => refreshed);

    await expect(
      loadProfileDataWithClientCache({
        viewerId: 'viewer-1',
        userId: 'user-2',
        force: true,
        load,
      }),
    ).resolves.toBe(refreshed);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps a preview incomplete when local media or connection data is merged', () => {
    primeProfilePreviewCacheForViewer('viewer-1', {
      id: 'user-2',
      name: 'Feed Lan',
    });

    updateProfileClientCacheEntry(
      'viewer-1',
      'user-2',
      completeProfile('user-2', 'Updated Lan'),
    );

    expect(getProfileClientCacheEntry('viewer-1', 'user-2')?.completeness).toBe(
      'partial',
    );
  });

  it('does not let a Feed preview or local merge refresh complete metadata', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const complete = {
      ...completeProfile('user-2', 'Network Lan'),
      profile: {
        ...completeProfile('user-2', 'Network Lan').profile,
        followingState: 'following' as const,
        followedByCurrentUser: true,
      },
    };
    setCompleteProfileClientCacheEntry('viewer-1', 'user-2', complete);
    const originalExpiry = getProfileClientCacheEntry(
      'viewer-1',
      'user-2',
    )?.expiresAt;

    nowSpy.mockReturnValue(61_000);
    primeProfilePreviewCacheForViewer('viewer-1', {
      id: 'user-2',
      name: 'Stale Feed Lan',
      isFollowing: false,
    });
    updateProfileClientCacheEntry('viewer-1', 'user-2', {
      ...complete,
      followers: [{ id: 'follower-1', name: 'Mai' }],
    });

    expect(getProfileClientCacheEntry('viewer-1', 'user-2')).toMatchObject({
      completeness: 'complete',
      expiresAt: originalExpiry,
      data: {
        profile: {
          name: 'Network Lan',
          followingState: 'following',
          followedByCurrentUser: true,
        },
        followers: [{ id: 'follower-1', name: 'Mai' }],
      },
    });
  });

  it('bounds retained profiles to forty entries', () => {
    for (let index = 0; index < 41; index += 1) {
      setCompleteProfileClientCacheEntry(
        'viewer-1',
        `user-${index}`,
        completeProfile(`user-${index}`, `User ${index}`),
      );
    }

    expect(getProfileClientCacheEntry('viewer-1', 'user-0')).toBeNull();
    expect(getProfileClientCacheEntry('viewer-1', 'user-40')).not.toBeNull();
  });
});
