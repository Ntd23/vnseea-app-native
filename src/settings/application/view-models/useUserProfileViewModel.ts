// Description: Fetches current user's profile data from WoWonder API (get-current-user.php)
// Uses the shared apiClient with session token authentication via sessionStorage.

import { useEffect, useState } from 'react';
import apiClient from '../../../shared-kernel/infrastructure/api/client';
import type { WoWonderUserData } from '../../domain/types/settings.types';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';

export function useUserProfileViewModel() {
  const currentUserVm = useCurrentUserViewModel();
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    isOnline: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use already-cached user profile from login
    if (currentUserVm.user) {
      const userData = currentUserVm.user;

      const userProfile = {
        id: userData.userId.toString(),
        name: userData.name || 'User',
        username: userData.username || '',
        avatarUrl: userData.avatar || null,
        coverUrl: null, // Will be fetched from API if needed
        isOnline: true, // TODO: Determine online status based on last_seen or active session
      };

      setProfile(userProfile);
      setIsLoading(false);
    } else if (currentUserVm.error) {
      setError(currentUserVm.error);
      setIsLoading(false);
    }
  }, [currentUserVm]);

  return {
    profile,
    isLoading,
    error,
  };
}
