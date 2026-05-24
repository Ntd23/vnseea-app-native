// Description: Defines the profile repository contract for profile presentation data.
import type { ProfileData, ProfileLoadInput } from '../types/profile.types';

export interface ProfileRepository {
  loadProfile(input?: ProfileLoadInput): Promise<ProfileData | null>;
}
