// Description: Provides user profile data for settings screen.
// Uses cached profile from sessionStorage (saved during login) for instant display.
// Falls back to API call if cache is missing.
import { useCallback, useEffect, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { UserProfile } from '../../domain/types/settings.types';

export function useUserProfileViewModel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      // First, try to get cached profile from sessionStorage (instant, no network)
      const cached = sessionStorage.getUserProfile();
      const session = sessionStorage.getSession();

      if (cached && session?.userId) {
        console.log('[Settings] Using cached profile:', cached);
        setProfile({
          id: session.userId,
          name: cached.name || 'User',
          username: cached.username || '',
          avatarUrl: cached.avatarUrl || null,
          coverUrl: null,
          isOnline: true,
        });
        setIsLoading(false);
        return;
      }

      // If no cached data, we need to fetch from API
      // But we can't do that without a token
      if (!session?.userId) {
        console.log('[Settings] No cached profile and no session - need login');
        setProfile(null);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Settings] Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    error,
  };
}
