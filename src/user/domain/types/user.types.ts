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
  registered?: string;
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
  twoFactor?: boolean;
  twoFactorVerified?: boolean;
  twoFactorMethod?: string;
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
    onlineStatus?: UserPrivacyValue;
    shareLocation?: UserPrivacyValue;
    shareData?: UserPrivacyValue;
  };
};

export type UserUploadFile = {
  uri: string;
  name: string;
  type: string;
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

export type NearbyPlaceKind = 'page' | 'shop' | 'business';

export type NearbyPlace = {
  id: string;
  pageId?: string;
  kind: NearbyPlaceKind;
  source?: 'page' | 'google';
  placeId?: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  coverUrl?: string;
  url?: string;
  category?: string;
  description?: string;
  location?: string;
  distance?: string | number;
  distanceMeters?: number;
  likes?: number;
  followersCount?: number;
  postCount?: number;
  isFollowing?: boolean;
  isLiked?: boolean;
  ownerId?: string;
  ownerName?: string;
  ownerUsername?: string;
  ownerAvatarUrl?: string;
  mapPinStatus?: string;
  mapPinApproved?: boolean;
  isPinned?: boolean;
  coordinate?: {
    latitude: number;
    longitude: number;
  };
};

export type NearbyPlacesInput = Pick<
  NearbyUsersInput,
  'distance' | 'keyword' | 'limit' | 'offset'
>;

export type NearbyPagesInput = Pick<
  NearbyUsersInput,
  'distance' | 'keyword' | 'limit' | 'lat' | 'lng'
>;

export type MapPlacePrediction = {
  source: 'google';
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
};

export type MapRouteInput = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  mode?: 'walking' | 'driving' | 'bicycling' | 'transit';
};

export type MapRoutePoint = {
  latitude: number;
  longitude: number;
};

export type MapRouteStep = {
  instruction?: string;
  maneuver?: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation?: MapRoutePoint;
  endLocation?: MapRoutePoint;
  path?: MapRoutePoint[];
};

export type MapRoute = {
  id?: string;
  summary?: string;
  path: MapRoutePoint[];
  steps?: MapRouteStep[];
  distanceMeters: number;
  durationSeconds: number;
  provider: 'google';
};

export type FriendsInput = {
  userId: string;
  type?: ('following' | 'followers')[];
  limit?: number;
  followingOffset?: number;
  followersOffset?: number;
};

export type FriendsResult = {
  following: UserProfile[];
  followers: UserProfile[];
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
  schoolCompleted: boolean;
  relationshipId: string;
  currentPassword: string;
  newPassword: string;
  avatar: UserUploadFile;
  cover: UserUploadFile;
  twoFactor: string;
  emailLiked: boolean;
  emailShared: boolean;
  emailWondered: boolean;
  emailCommented: boolean;
  emailFollowed: boolean;
  emailLikedPage: boolean;
  emailVisited: boolean;
  emailMentioned: boolean;
  emailJoinedGroup: boolean;
  emailAccepted: boolean;
  emailProfileWallPost: boolean;
  messagePrivacy: UserPrivacyValue;
  followPrivacy: UserPrivacyValue;
  friendPrivacy: UserPrivacyValue;
  postPrivacy: UserPrivacyValue;
  birthPrivacy: UserPrivacyValue;
  phonePrivacy: UserPrivacyValue;
  visitPrivacy: UserPrivacyValue;
  showLastSeen: UserPrivacyValue;
  confirmFollowers: UserPrivacyValue;
  showActivities: UserPrivacyValue;
  onlineStatus: UserPrivacyValue;
  shareLocation: UserPrivacyValue;
  shareData: UserPrivacyValue;
}>;

export type UpdateCurrentUserResult = {
  message?: string;
};
