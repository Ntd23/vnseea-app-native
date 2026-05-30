// Description: Defines the profile repository contract for profile presentation data.
import type { ProfileData, ProfileLoadInput } from '../types/profile.types';
import type { FollowState } from '../../../user/domain/types/user.types';

export interface ProfileRepository {
  loadProfile(input?: ProfileLoadInput): Promise<ProfileData | null>;
  toggleFollow(userId: string): Promise<FollowState>;
  pokeUser(userId: string): Promise<void>;
}
