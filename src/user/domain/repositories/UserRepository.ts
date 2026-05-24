// Description: Defines the user repository contract for profile and user discovery APIs.
import type {
  GetUserProfileInput,
  NearbyUsersInput,
  UpdateCurrentUserInput,
  UpdateCurrentUserResult,
  UserProfile,
  UserProfileResult,
  UserSuggestionsInput,
} from '../types/user.types';

export interface UserRepository {
  getCurrentUser(): Promise<UserProfile | null>;
  getUserProfile(input: GetUserProfileInput): Promise<UserProfileResult>;
  getSuggestions(input?: UserSuggestionsInput): Promise<UserProfile[]>;
  getNearbyUsers(input?: NearbyUsersInput): Promise<UserProfile[]>;
  updateCurrentUser(
    input: UpdateCurrentUserInput,
  ): Promise<UpdateCurrentUserResult>;
}
