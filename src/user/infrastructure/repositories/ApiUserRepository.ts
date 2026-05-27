// Description: Implements the user repository through the shared API bridge.
import type {
  ApiEnvelope,
  RawApiRecord,
} from '../../../shared-kernel/domain/types/api.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { mapGroupSummary } from '../../../foundation/application/mappers/groupSummaryMapper';
import { mapPageSummary } from '../../../foundation/application/mappers/pageSummaryMapper';
import { asRecord } from '../../../foundation/application/normalizers/resolveValue';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type {
  GetUserProfileInput,
  NearbyUsersInput,
  UpdateCurrentUserInput,
  UserProfile,
  UserProfileResult,
  UserSuggestionsInput,
} from '../../domain/types/user.types';
import { mapUserProfile } from '../../application/mappers/userProfileMapper';
import {
  toNearbyUsersPayload,
  toUpdateCurrentUserPayload,
  toUserProfileFetchValue,
  toUserSuggestionsPayload,
} from '../../application/mappers/userPayloadMapper';

type CurrentUserResponse = ApiEnvelope & {
  user_data?: RawApiRecord;
};

type UserProfileResponse = ApiEnvelope & {
  user_data?: RawApiRecord;
  followers?: RawApiRecord[];
  following?: RawApiRecord[];
  liked_pages?: RawApiRecord[];
  joined_groups?: RawApiRecord[];
  family?: Array<RawApiRecord | { user_data?: RawApiRecord }>;
};

type UserSuggestionsResponse = ApiEnvelope & {
  suggestions?: RawApiRecord[];
  contacts_suggestions?: RawApiRecord[];
};

type NearbyUsersResponse = ApiEnvelope & {
  nearby_users?: RawApiRecord[];
};

type UpdateUserResponse = ApiEnvelope & {
  message?: string;
};

function mapUserList(records: RawApiRecord[] | undefined): UserProfile[] {
  return (records ?? []).map(record =>
    mapUserProfile(record, apiConfig.webBaseUrl),
  );
}

function mapFamily(records: UserProfileResponse['family']): UserProfile[] {
  return (records ?? [])
    .map(record => {
      const directRecord = asRecord(record);
      const userRecord = asRecord(directRecord?.user_data) ?? directRecord;
      return userRecord
        ? mapUserProfile(userRecord, apiConfig.webBaseUrl)
        : null;
    })
    .filter(Boolean) as UserProfile[];
}

function mapUserProfileResponse(
  response: UserProfileResponse,
): UserProfileResult {
  return {
    profile: response.user_data
      ? mapUserProfile(response.user_data, apiConfig.webBaseUrl)
      : undefined,
    followers: mapUserList(response.followers),
    following: mapUserList(response.following),
    likedPages: (response.liked_pages ?? []).map(record =>
      mapPageSummary(record, apiConfig.webBaseUrl),
    ),
    joinedGroups: (response.joined_groups ?? []).map(record =>
      mapGroupSummary(record, apiConfig.webBaseUrl),
    ),
    family: mapFamily(response.family),
  };
}

export function createUserRepository(): UserRepository {
  return {
    async getCurrentUser() {
      if (!sessionStorage.getAccessToken()) {
        return null;
      }

      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.auth.me,
      );

      if (!response.user_data) {
        return null;
      }

      return mapUserProfile(response.user_data, apiConfig.webBaseUrl);
    },

    async getUserProfile(input: GetUserProfileInput) {
      // If no userId provided, fetch current user's profile via get-current-user endpoint
      if (!input?.userId) {
        const currentUserResponse = await apiBridge.post<CurrentUserResponse>(
          apiRoutes.auth.me,
        );

        if (!currentUserResponse.user_data) {
          return { profile: undefined, followers: [], following: [], likedPages: [], joinedGroups: [], family: [] };
        }

        return {
          profile: mapUserProfile(currentUserResponse.user_data, apiConfig.webBaseUrl),
          followers: [],
          following: [],
          likedPages: [],
          joinedGroups: [],
          family: [],
        };
      }

      const response = await apiBridge.post<UserProfileResponse>(
        apiRoutes.user.get,
        {
          user_id: input.userId,
          fetch: toUserProfileFetchValue(input.fetch),
          send_notify: input.sendVisitNotification ? 1 : undefined,
        },
      );

      return mapUserProfileResponse(response);
    },

    async getSuggestions(input?: UserSuggestionsInput) {
      const response = await apiBridge.post<UserSuggestionsResponse>(
        apiRoutes.user.suggestions,
        toUserSuggestionsPayload(input),
      );

      return mapUserList(response.suggestions);
    },

    async getNearbyUsers(input?: NearbyUsersInput) {
      const response = await apiBridge.post<NearbyUsersResponse>(
        apiRoutes.user.nearby,
        toNearbyUsersPayload(input),
      );

      return mapUserList(response.nearby_users);
    },

    async updateCurrentUser(input: UpdateCurrentUserInput) {
      const response = await apiBridge.post<UpdateUserResponse>(
        apiRoutes.user.update,
        toUpdateCurrentUserPayload(input),
      );

      return {
        message: response.message,
      };
    },
  };
}
