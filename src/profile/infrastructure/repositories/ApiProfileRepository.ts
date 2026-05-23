// Description: Implements profile presentation data loading through the user context API bridge.
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';

const userRepository = createUserRepository();

export function createProfileRepository(): ProfileRepository {
  return {
    async loadProfile(input) {
      if (!input?.userId) {
        const currentUser = await userRepository.getCurrentUser();

        return currentUser
          ? {
              profile: currentUser,
            }
          : null;
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
