// Description: Loads the authenticated viewer's full profile for Settings.
import { useCallback, useEffect, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';

const repository = createUserRepository();

function getCachedProfile(): UserProfile | null {
  const session = sessionStorage.getSession();
  const cached = sessionStorage.getUserProfile();

  if (!session?.userId || !cached) return null;

  return {
    id: session.userId,
    name: cached.name,
    username: cached.username,
    avatarUrl: cached.avatarUrl,
  };
}

export function useMyInfoViewModel() {
  const [profile, setProfile] = useState<UserProfile | null>(getCachedProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (showRefreshIndicator = false) => {
    const userId = sessionStorage.getSession()?.userId;

    if (!userId) {
      setProfile(null);
      setError('Phiên đăng nhập đã hết hạn.');
      setIsLoading(false);
      return;
    }

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await repository.getUserProfile({
        userId,
        fetch: { userData: true },
        sendVisitNotification: false,
      });
      const nextProfile = response.profile ?? null;

      setProfile(nextProfile);
      if (nextProfile) {
        sessionStorage.setUserProfile({
          name: nextProfile.name,
          username: nextProfile.username,
          avatarUrl: nextProfile.avatarUrl,
        });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được thông tin cá nhân.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile().catch(() => undefined);
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    isRefreshing,
    error,
    refresh: () => loadProfile(true),
    retry: () => loadProfile(false),
  };
}
