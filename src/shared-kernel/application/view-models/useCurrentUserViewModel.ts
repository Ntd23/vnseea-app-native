// UseCurrentUserViewModel - Get the current logged-in user's profile data
//
// Uses cached user profile from sessionStorage that was saved during login.
// No additional API calls needed - data is already available from authentication.

import { useEffect, useState } from 'react';
import { sessionStorage } from '../../infrastructure/storage/sessionStorage';

export type CurrentUserProfile = {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  cover?: string;
};

export function useCurrentUserViewModel() {
  // DEBUG: Log when hook is called
  console.log('[useCurrentUserViewModel] Hook called');

  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useCurrentUserViewModel] Loading user from sessionStorage');

    // Get cached user profile from sessionStorage (already saved during login)
    const cached = sessionStorage.getUserProfile();
    const session = sessionStorage.getSession();

    console.log('[useCurrentUserViewModel] Cached profile:', cached);
    console.log('[useCurrentUserViewModel] Session:', session);

    if (cached && session?.userId) {
      const cachedUser: CurrentUserProfile = {
        userId: session.userId,
        name: cached.name ?? '',
        username: cached.username ?? '',
        // Use fallback image if avatar is not set
        avatar: cached.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
      };

      console.log('[useCurrentUserViewModel] Loaded user:', cachedUser);
      setUser(cachedUser);
    } else {
      setError('No user profile found in session storage');
    }

    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    error,
  };
}
