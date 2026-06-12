// Description: Maps user application inputs into WoWonder API payload fields.
import type {
  NearbyUsersInput,
  NearbyPagesInput,
  NearbyPlacesInput,
  UpdateCurrentUserInput,
  UserProfileFetch,
  UserSuggestionsInput,
} from '../../domain/types/user.types';

const DEFAULT_PROFILE_FETCH: Required<UserProfileFetch> = {
  userData: true,
  followers: false,
  following: false,
  likedPages: false,
  joinedGroups: false,
  family: false,
};

function putIfDefined(
  payload: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== undefined && value !== null && value !== '') {
    payload[key] = value;
  }
}

function putBooleanFlag(
  payload: Record<string, unknown>,
  key: string,
  value: boolean | undefined,
) {
  if (value !== undefined) {
    payload[key] = value ? '1' : '0';
  }
}

export function toUserProfileFetchValue(fetch?: UserProfileFetch) {
  const resolvedFetch = {
    ...DEFAULT_PROFILE_FETCH,
    ...fetch,
  };

  return [
    resolvedFetch.userData ? 'user_data' : undefined,
    resolvedFetch.followers ? 'followers' : undefined,
    resolvedFetch.following ? 'following' : undefined,
    resolvedFetch.likedPages ? 'liked_pages' : undefined,
    resolvedFetch.joinedGroups ? 'joined_groups' : undefined,
    resolvedFetch.family ? 'family' : undefined,
  ]
    .filter(Boolean)
    .join(',');
}

export function toUserSuggestionsPayload(input?: UserSuggestionsInput) {
  const payload: Record<string, unknown> = {};
  putIfDefined(payload, 'limit', input?.limit);
  putIfDefined(payload, 'contacts', input?.contacts);
  return payload;
}

export function toNearbyUsersPayload(input?: NearbyUsersInput) {
  const payload: Record<string, unknown> = {};
  putIfDefined(payload, 'limit', input?.limit);
  putIfDefined(payload, 'offset', input?.offset);
  putIfDefined(payload, 'gender', input?.gender);
  putIfDefined(payload, 'keyword', input?.keyword);
  putIfDefined(payload, 'status', input?.status);
  putIfDefined(payload, 'distance', input?.distance);
  putIfDefined(payload, 'relship', input?.relationship);
  putIfDefined(payload, 'lat', input?.lat);
  putIfDefined(payload, 'lng', input?.lng);
  return payload;
}

export function toNearbyPlacesPayload(input?: NearbyPlacesInput) {
  const payload: Record<string, unknown> = {};
  putIfDefined(payload, 'limit', input?.limit);
  putIfDefined(payload, 'offset', input?.offset);
  putIfDefined(payload, 'name', input?.keyword);
  putIfDefined(payload, 'distance', input?.distance);
  return payload;
}

export function toNearbyPagesQuery(input?: NearbyPagesInput) {
  const query: Record<string, unknown> = {
    application: 'phone',
    f: 'explore_nearby_suggestions',
    type: 'page',
  };
  putIfDefined(query, 'query', input?.keyword);
  putIfDefined(query, 'distance', input?.distance);
  putIfDefined(query, 'limit', input?.limit);
  putIfDefined(query, 'origin_lat', input?.lat);
  putIfDefined(query, 'origin_lng', input?.lng);
  return query;
}

export function toUpdateCurrentUserPayload(input: UpdateCurrentUserInput) {
  const payload: Record<string, unknown> = {};
  putIfDefined(payload, 'username', input.username);
  putIfDefined(payload, 'email', input.email);
  putIfDefined(payload, 'phone_number', input.phoneNumber);
  putIfDefined(payload, 'first_name', input.firstName);
  putIfDefined(payload, 'last_name', input.lastName);
  putIfDefined(payload, 'gender', input.gender);
  putIfDefined(payload, 'birthday', input.birthday);
  putIfDefined(payload, 'country_id', input.countryId);
  putIfDefined(payload, 'website', input.website);
  putIfDefined(payload, 'about', input.about);
  putIfDefined(payload, 'working', input.working);
  putIfDefined(payload, 'working_link', input.workingLink);
  putIfDefined(payload, 'address', input.address);
  putIfDefined(payload, 'school', input.school);
  putIfDefined(
    payload,
    'school_completed',
    input.schoolCompleted === undefined
      ? undefined
      : input.schoolCompleted
        ? '1'
        : '0',
  );
  putIfDefined(payload, 'relationship', input.relationshipId);
  putIfDefined(payload, 'relationship_id', input.relationshipId);
  putIfDefined(payload, 'current_password', input.currentPassword);
  putIfDefined(payload, 'new_password', input.newPassword);
  putIfDefined(payload, 'avatar', input.avatar);
  putIfDefined(payload, 'cover', input.cover);
  putIfDefined(payload, 'two_factor', input.twoFactor);
  putBooleanFlag(payload, 'e_liked', input.emailLiked);
  putBooleanFlag(payload, 'e_shared', input.emailShared);
  putBooleanFlag(payload, 'e_wondered', input.emailWondered);
  putBooleanFlag(payload, 'e_commented', input.emailCommented);
  putBooleanFlag(payload, 'e_followed', input.emailFollowed);
  putBooleanFlag(payload, 'e_liked_page', input.emailLikedPage);
  putBooleanFlag(payload, 'e_visited', input.emailVisited);
  putBooleanFlag(payload, 'e_mentioned', input.emailMentioned);
  putBooleanFlag(payload, 'e_joined_group', input.emailJoinedGroup);
  putBooleanFlag(payload, 'e_accepted', input.emailAccepted);
  putBooleanFlag(payload, 'e_profile_wall_post', input.emailProfileWallPost);
  putIfDefined(payload, 'message_privacy', input.messagePrivacy);
  putIfDefined(payload, 'follow_privacy', input.followPrivacy);
  putIfDefined(payload, 'friend_privacy', input.friendPrivacy);
  putIfDefined(payload, 'post_privacy', input.postPrivacy);
  putIfDefined(payload, 'birth_privacy', input.birthPrivacy);
  putIfDefined(payload, 'phone_privacy', input.phonePrivacy);
  putIfDefined(payload, 'visit_privacy', input.visitPrivacy);
  putIfDefined(payload, 'showlastseen', input.showLastSeen);
  putIfDefined(payload, 'confirm_followers', input.confirmFollowers);
  putIfDefined(payload, 'show_activities_privacy', input.showActivities);
  putIfDefined(payload, 'status', input.onlineStatus);
  putIfDefined(payload, 'share_my_location', input.shareLocation);
  putIfDefined(payload, 'share_my_data', input.shareData);
  return payload;
}
