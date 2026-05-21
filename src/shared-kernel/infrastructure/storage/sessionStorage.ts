// Description: Persists the authenticated backend session for API requests.
import { createMMKV } from 'react-native-mmkv';

export type AuthSession = {
  accessToken: string;
  userId?: string;
  userPlatform?: string;
};

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const USER_ID_KEY = 'auth.userId';
const USER_PLATFORM_KEY = 'auth.userPlatform';

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

  clearSession() {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(USER_ID_KEY);
    storage.remove(USER_PLATFORM_KEY);
  },
};
