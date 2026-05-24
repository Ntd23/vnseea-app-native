// Description: Defines profile presentation domain types backed by the user context.
import type {
  UserProfile,
  UserProfileResult,
} from '../../../user/domain/types/user.types';

export type ProfileLoadInput = {
  userId?: string;
  includeFriends?: boolean;
};

export type ProfileDetails = UserProfile;

export type ProfileData = UserProfileResult & {
  profile?: ProfileDetails;
};
