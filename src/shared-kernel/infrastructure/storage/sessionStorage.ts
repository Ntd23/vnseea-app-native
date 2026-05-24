// Description: Persists the authenticated backend session for API requests.
import { createMMKV } from 'react-native-mmkv';

export type AuthSession = {
  accessToken: string;
  userId?: string;
  userPlatform?: string;
};

/**
 * Cached profile data for the current viewer.
 *
 * Stored alongside the session token so screens can render optimistic UI
 * (e.g. an in-flight comment with the user's name + avatar) without
 * waiting for a network round-trip. Filled the first time
 * `/api/get-user-data` returns successfully; survives reload because MMKV
 * is on-disk.
 */
export type AuthUserProfile = {
  name?: string;
  username?: string;
  avatarUrl?: string;
};

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const USER_ID_KEY = 'auth.userId';
const USER_PLATFORM_KEY = 'auth.userPlatform';
const USER_NAME_KEY = 'auth.userName';
const USER_USERNAME_KEY = 'auth.userUsername';
const USER_AVATAR_KEY = 'auth.userAvatar';

const storage = createMMKV({ id: 'vnseea-auth-session' });

export const sessionStorage = {
  getAccessToken() {
    return storage.getString(ACCESS_TOKEN_KEY) ?? null;
  },

  getSession(): AuthSession | null {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      userId: storage.getString(USER_ID_KEY) ?? undefined,
      userPlatform: storage.getString(USER_PLATFORM_KEY) ?? undefined,
    };
  },

  setSession(session: AuthSession) {
    storage.set(ACCESS_TOKEN_KEY, session.accessToken);

    if (session.userId) {
      storage.set(USER_ID_KEY, session.userId);
    }

    if (session.userPlatform) {
      storage.set(USER_PLATFORM_KEY, session.userPlatform);
    }
  },

  /**
   * Return the cached profile, or `null` if we've never fetched it.
   * Always returns an object when ANY field is set — caller should
   * check individual fields for presence.
   */
  getUserProfile(): AuthUserProfile | null {
    const name = storage.getString(USER_NAME_KEY);
    const username = storage.getString(USER_USERNAME_KEY);
    const avatarUrl = storage.getString(USER_AVATAR_KEY);
    if (!name && !username && !avatarUrl) return null;
    return { name, username, avatarUrl };
  },

  /**
   * Persist the viewer's display-only profile data. Pass `undefined` /
   * empty string for fields we don't have — they'll be removed so a
   * later partial update doesn't leave stale data behind.
   */
  setUserProfile(profile: AuthUserProfile) {
    if (profile.name) {
      storage.set(USER_NAME_KEY, profile.name);
    } else {
      storage.remove(USER_NAME_KEY);
    }
    if (profile.username) {
      storage.set(USER_USERNAME_KEY, profile.username);
    } else {
      storage.remove(USER_USERNAME_KEY);
    }
    if (profile.avatarUrl) {
      storage.set(USER_AVATAR_KEY, profile.avatarUrl);
    } else {
      storage.remove(USER_AVATAR_KEY);
    }
  },

  clearSession() {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(USER_ID_KEY);
    storage.remove(USER_PLATFORM_KEY);
    storage.remove(USER_NAME_KEY);
    storage.remove(USER_USERNAME_KEY);
    storage.remove(USER_AVATAR_KEY);
  },
};
