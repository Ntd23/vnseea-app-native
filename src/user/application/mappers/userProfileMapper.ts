// Description: Maps raw WoWonder user records into the user profile domain model.
import type {
  RawRecord,
  UserSummary,
} from '../../../foundation/domain/types/foundation.types';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  firstBoolean,
  firstEntityId,
  firstString,
} from '../../../foundation/application/normalizers/resolveValue';
import { normalizeRawUrl } from '../../../foundation/application/normalizers/url';
import { mapUserSummary } from '../../../foundation/application/mappers/userSummaryMapper';
import type { FollowState, UserProfile } from '../../domain/types/user.types';

function boolish(value: unknown) {
  return asBoolean(value);
}

function followState(record: RawRecord): FollowState | undefined {
  const rawValue = record.is_following;

  if (rawValue === 1 || rawValue === '1' || rawValue === 'yes') {
    return 'following';
  }

  if (rawValue === 2 || rawValue === '2' || rawValue === 'requested') {
    return 'requested';
  }

  if (rawValue === 0 || rawValue === '0' || rawValue === 'no') {
    return 'none';
  }

  return undefined;
}

function mapNotificationSettings(value: unknown) {
  const record = asRecord(value);
  return record ?? undefined;
}

function primitiveValue(value: unknown) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return undefined;
}

function stringNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'number') {
    return value;
  }

  return asString(value);
}

function positiveEntityId(record: RawRecord, keys: string[]) {
  const value = firstEntityId(record, keys);
  return value && /^[1-9][0-9]*$/.test(value) ? value : undefined;
}

function profileCount(record: RawRecord, key: string) {
  const details = asRecord(record.details);
  return asNumber(details?.[key] ?? record[key]);
}

function mapPrivacy(record: RawRecord): UserProfile['privacy'] {
  return {
    message: primitiveValue(record.message_privacy),
    follow: primitiveValue(record.follow_privacy),
    friend: primitiveValue(record.friend_privacy ?? record.friendPrivacy),
    post: primitiveValue(record.post_privacy),
    birth: primitiveValue(record.birth_privacy),
    phone: primitiveValue(record.phone_privacy),
    visit: primitiveValue(record.visit_privacy ?? record.visitPrivacy),
    showLastSeen: primitiveValue(record.showlastseen ?? record.show_lastseen),
    confirmFollowers: primitiveValue(record.confirm_followers ?? record.confirmFollowers),
    showActivities: primitiveValue(record.show_activities_privacy ?? record.showActivitiesPrivacy),
    onlineStatus: primitiveValue(record.online_status ?? record.status),
    shareLocation: primitiveValue(record.share_my_location ?? record.shareLocation),
    shareData: primitiveValue(record.share_my_data ?? record.shareData),
  };
}

export function mapUserProfile(
  record: RawRecord,
  webBaseUrl: string,
): UserProfile {
  const summary: UserSummary = mapUserSummary(record, webBaseUrl);

  return {
    ...summary,
    id: summary.id ?? firstEntityId(record, ['user_id', 'id']),
    email: firstString(record, ['email']),
    registered: firstString(record, ['registered']),
    phoneNumber: firstString(record, ['phone_number', 'phone']),
    gender: firstString(record, ['gender']),
    genderText: firstString(record, ['gender_text']),
    birthday: firstString(record, ['birthday']),
    countryId: firstString(record, ['country_id']),
    website: firstString(record, ['website']),
    about: firstString(record, ['about']),
    firstName: firstString(record, ['first_name']),
    lastName: firstString(record, ['last_name']),
    working: firstString(record, ['working']),
    workingLink: firstString(record, ['working_link']),
    address: firstString(record, ['address']),
    school: firstString(record, ['school']),
    schoolCompleted: firstBoolean(record, ['school_completed']),
    relationshipId: firstString(record, ['relationship_id']),
    coverUrl: normalizeRawUrl(firstString(record, ['cover']), webBaseUrl),
    avatarPostId: positiveEntityId(record, ['avatar_post_id', 'avatarPostId']),
    coverPostId: positiveEntityId(record, ['cover_post_id', 'coverPostId']),
    postCount: profileCount(record, 'post_count'),
    followersCount: profileCount(record, 'followers_count'),
    followingCount: profileCount(record, 'following_count'),
    facebook: firstString(record, ['facebook']),
    twitter: firstString(record, ['twitter']),
    linkedin: firstString(record, ['linkedin']),
    instagram: firstString(record, ['instagram']),
    youtube: firstString(record, ['youtube']),
    vk: firstString(record, ['vk']),
    admin: boolish(record.admin),
    active: boolish(record.active),
    pro: boolish(record.is_pro),
    proType: firstString(record, ['pro_type']),
    wallet: stringNumberOrNull(record.wallet),
    points: stringNumberOrNull(record.points),
    lastSeenText: firstString(record, ['lastseen_time_text', 'lastseen_text']),
    followingState: followState(record),
    canFollow: boolish(record.can_follow),
    followedByCurrentUser: boolish(record.is_following),
    followsCurrentUser: boolish(record.is_following_me),
    blocked: boolish(record.is_blocked),
    distance: stringNumberOrNull(record.distance) ?? undefined,
    geoInfo: record.user_geoinfo,
    notificationSettings: mapNotificationSettings(record.notification_settings),
    twoFactor: firstBoolean(record, ['two_factor']),
    twoFactorVerified: firstBoolean(record, ['two_factor_verified']),
    twoFactorMethod: firstString(record, ['two_factor_method']),
    privacy: mapPrivacy(record),
  };
}
