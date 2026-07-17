import { useEffect, useState } from 'react';
import { createAuthRepository } from '../../../auth/infrastructure/repositories/ApiAuthRepository';
import { sessionStorage } from '../../infrastructure/storage/sessionStorage';

export type CurrentUserProfile = {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  cover?: string;
};

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

function mapCachedUser(
  userId: string,
  cached: ReturnType<typeof sessionStorage.getUserProfile>,
): CurrentUserProfile | null {
  if (!cached) return null;

  return {
    userId,
    name: cached.name || cached.username || '',
    username: cached.username || '',
    avatar: cached.avatarUrl || FALLBACK_AVATAR,
  };
}

function shouldRefreshProfile(
  cached: ReturnType<typeof sessionStorage.getUserProfile>,
) {
  return !cached?.name || !cached?.username || !cached?.avatarUrl;
}

export function useCurrentUserViewModel() {
  const [user, setUser] = useState<CurrentUserProfile | null>(() => {
    const session = sessionStorage.getSession();
    return session?.userId
      ? mapCachedUser(session.userId, sessionStorage.getUserProfile())
      : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const syncUserFromCache = () => {
      if (cancelled) return;

      const activeSession = sessionStorage.getSession();
      const activeCachedProfile = sessionStorage.getUserProfile();

      if (!activeSession?.userId) {
        setUser(null);
        return;
      }

      const nextCachedUser = mapCachedUser(
        activeSession.userId,
        activeCachedProfile,
      );
      if (nextCachedUser) {
        setUser(nextCachedUser);
        setError(null);
      }
    };
    const unsubscribeProfile =
      sessionStorage.subscribeToUserProfile(syncUserFromCache);
    const session = sessionStorage.getSession();
    const cached = sessionStorage.getUserProfile();

    if (!session?.userId) {
      setUser(null);
      setError('No active user session found');
      setIsLoading(false);
      return unsubscribeProfile;
    }

    const sessionUserId = session.userId;
    const cachedUser = mapCachedUser(sessionUserId, cached);
    if (cachedUser) {
      setUser(cachedUser);
      setError(null);
    }

    if (!shouldRefreshProfile(cached)) {
      setIsLoading(false);
      return unsubscribeProfile;
    }

    setIsLoading(!cachedUser);

    (async () => {
      try {
        const authRepo = createAuthRepository();
        const result = await authRepo.fetchUserById(sessionUserId);
        if (cancelled || !result?.user) return;

        const nextUser: CurrentUserProfile = {
          userId: sessionUserId,
          name: result.user.name || result.user.username || '',
          username: result.user.username || '',
          avatar: result.user.avatar || FALLBACK_AVATAR,
        };

        sessionStorage.setUserProfile({
          name: nextUser.name,
          username: nextUser.username,
          avatarUrl: result.user.avatar || undefined,
        });
        setUser(nextUser);
        setError(null);
      } catch (caught) {
        if (!cancelled && !cachedUser) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No user profile found in session storage',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeProfile();
    };
  }, []);

  return {
    user,
    isLoading,
    error,
  };
}
