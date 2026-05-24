// Description: Maps user application inputs into WoWonder API payload fields.
import type {
  NearbyUsersInput,
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
  putIfDefined(payload, 'relationship', input.relationshipId);
  putIfDefined(payload, 'message_privacy', input.messagePrivacy);
  putIfDefined(payload, 'follow_privacy', input.followPrivacy);
  putIfDefined(payload, 'friend_privacy', input.friendPrivacy);
  putIfDefined(payload, 'post_privacy', input.postPrivacy);
  putIfDefined(payload, 'birth_privacy', input.birthPrivacy);
  putIfDefined(payload, 'phone_privacy', input.phonePrivacy);
  putIfDefined(payload, 'visit_privacy', input.visitPrivacy);
  putIfDefined(payload, 'showlastseen', input.showLastSeen);
  putIfDefined(payload, 'confirm_followers', input.confirmFollowers);
  putIfDefined(payload, 'share_my_location', input.shareLocation);
  return payload;
}
