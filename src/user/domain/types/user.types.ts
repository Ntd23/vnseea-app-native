// Description: Defines user domain types shared by profile, settings, search, and social contexts.
import type {
  GroupSummary,
  PageSummary,
  UserSummary,
} from '../../../foundation';

export type UserGender = 'male' | 'female' | string;

export type FollowState = 'none' | 'following' | 'requested';

export type UserPrivacyValue = string | number | boolean | undefined;

export type UserProfile = UserSummary & {
  email?: string;
  phoneNumber?: string;
  gender?: UserGender;
  genderText?: string;
  birthday?: string;
  countryId?: string;
  website?: string;
  about?: string;
  firstName?: string;
  lastName?: string;
  working?: string;
  workingLink?: string;
  address?: string;
  school?: string;
  schoolCompleted?: boolean;
  relationshipId?: string;
  coverUrl?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  vk?: string;
  admin?: boolean;
  active?: boolean;
  pro?: boolean;
  proType?: string;
  wallet?: string | number | null;
  points?: string | number | null;
  lastSeenText?: string;
  followingState?: FollowState;
  canFollow?: boolean;
  followedByCurrentUser?: boolean;
  followsCurrentUser?: boolean;
  blocked?: boolean;
  distance?: string | number;
  geoInfo?: unknown;
  notificationSettings?: Record<string, unknown>;
  privacy?: {
    message?: UserPrivacyValue;
    follow?: UserPrivacyValue;
    friend?: UserPrivacyValue;
    post?: UserPrivacyValue;
    birth?: UserPrivacyValue;
    phone?: UserPrivacyValue;
    visit?: UserPrivacyValue;
    showLastSeen?: UserPrivacyValue;
    confirmFollowers?: UserPrivacyValue;
    showActivities?: UserPrivacyValue;
    shareLocation?: UserPrivacyValue;
    shareData?: UserPrivacyValue;
  };
};

export type UserProfileFetch = {
  userData?: boolean;
  followers?: boolean;
  following?: boolean;
  likedPages?: boolean;
  joinedGroups?: boolean;
  family?: boolean;
};

export type GetUserProfileInput = {
  userId?: string;
  fetch?: UserProfileFetch;
  sendVisitNotification?: boolean;
};

export type UserProfileResult = {
  profile?: UserProfile;
  followers?: UserProfile[];
  following?: UserProfile[];
  likedPages?: PageSummary[];
  joinedGroups?: GroupSummary[];
  family?: UserProfile[];
};

export type UserSuggestionsInput = {
  limit?: number;
  contacts?: string;
};

export type NearbyUsersInput = {
  limit?: number;
  offset?: number;
  gender?: UserGender;
  keyword?: string;
  status?: string;
  distance?: string | number;
  relationship?: string;
  lat?: string | number;
  lng?: string | number;
};

export type UpdateCurrentUserInput = Partial<{
  username: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  gender: UserGender;
  birthday: string;
  countryId: string;
  website: string;
  about: string;
  working: string;
  workingLink: string;
  address: string;
  school: string;
  relationshipId: string;
  messagePrivacy: UserPrivacyValue;
  followPrivacy: UserPrivacyValue;
  friendPrivacy: UserPrivacyValue;
  postPrivacy: UserPrivacyValue;
  birthPrivacy: UserPrivacyValue;
  phonePrivacy: UserPrivacyValue;
  visitPrivacy: UserPrivacyValue;
  showLastSeen: UserPrivacyValue;
  confirmFollowers: UserPrivacyValue;
  shareLocation: UserPrivacyValue;
}>;

export type UpdateCurrentUserResult = {
  message?: string;
};
