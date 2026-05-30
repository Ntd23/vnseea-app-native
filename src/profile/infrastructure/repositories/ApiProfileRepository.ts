// Description: Implements profile presentation data loading through the user context API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { FollowState } from '../../../user/domain/types/user.types';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';

const userRepository = createUserRepository();

function toFollowState(status: string | undefined): FollowState {
  if (status === 'followed') return 'following';
  if (status === 'requested') return 'requested';
  return 'none';
}

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

    async toggleFollow(userId) {
      const response = await apiBridge.post<{
        api_status: number | string;
        follow_status?: string;
      }>(apiRoutes.social.follow, {
        user_id: userId,
      });

      return toFollowState(response.follow_status);
    },

    async pokeUser(userId) {
      await apiBridge.post<{
        api_status: number | string;
        message_data?: string;
      }>(apiRoutes.social.poke, {
        type: 'create',
        user_id: userId,
      });
    },
  };
}
