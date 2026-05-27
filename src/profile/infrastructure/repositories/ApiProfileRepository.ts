// Description: Implements profile presentation data loading through the user context API bridge.
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';

const userRepository = createUserRepository();

export function createProfileRepository(): ProfileRepository {
  return {
    async loadProfile(input) {
      // Get current user ID from sessionStorage for own profile
      const session = sessionStorage.getSession();
      const currentUserId = session?.userId;

      if (!input?.userId) {
        // Viewing current user's profile - use get-user-data with userId for full data
        // (get-current-user doesn't return followers/following)
        if (currentUserId) {
          return userRepository.getUserProfile({
            userId: currentUserId,
            fetch: {
              userData: true,
              followers: true,
              following: true,
              likedPages: false,
              joinedGroups: false,
              family: false,
            },
            sendVisitNotification: false,
          });
        }

        // Fallback if no session - shouldn't happen but handle gracefully
        return { profile: undefined, followers: [], following: [], likedPages: [], joinedGroups: [], family: [] };
      }

      return userRepository.getUserProfile({
        userId: input.userId,
        fetch: {
          userData: true,
          followers: input.includeFriends,
          following: input.includeFriends,
          likedPages: false,
          joinedGroups: false,
          family: false,
        },
        sendVisitNotification: true,
      });
    },
  };
}
