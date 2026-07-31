// Description: Implements profile presentation data loading through the user context API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { languageStorage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getPokeCopy } from '../../../poke/application/i18n/pokeCopy';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { FollowState } from '../../../user/domain/types/user.types';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';

const userRepository = createUserRepository();

function toFollowState(status: string | undefined): FollowState {
  if (status === 'followed') return 'following';
  if (status === 'requested') return 'requested';
  return 'none';
}

function mapPokeError(error: unknown, language: AppLanguage) {
  const message = error instanceof Error ? error.message : String(error);
  const copy = getPokeCopy(language);

  if (message.toLowerCase().includes('you can not poke your self')) return String(copy.cannotPokeSelf);
  if (message.toLowerCase().includes('this user is poked')) return String(copy.alreadyPoked);
  if (message.toLowerCase().includes('poke not found')) return String(copy.pokeNotFound);
  if (message.toLowerCase().includes('you are not the poke owner')) return String(copy.notPokeOwner);
  return message || String(copy.genericError);
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
          const includeFriends = input?.includeFriends !== false;
          return userRepository.getUserProfile({
            userId: currentUserId,
            fetch: {
              userData: true,
              followers: includeFriends,
              following: includeFriends,
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

    async loadConnections(userId, limit = 3) {
      return userRepository.getFriends({
        userId: String(userId),
        type: ['following', 'followers'],
        limit,
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
      const response = await apiBridge.post<{
        api_status: number | string;
        message_data?: string;
        errors?: {
          error_text?: string;
        };
      }>(apiRoutes.social.poke, {
        type: 'create',
        user_id: userId,
      });

      if (response.api_status !== 200 && response.api_status !== '200') {
        const errorMessage = response.errors?.error_text || response.message_data || 'Không thể poke người dùng.';
        const language = languageStorage.getLanguage();
        throw new Error(mapPokeError(errorMessage, language));
      }
    },
  };
}
