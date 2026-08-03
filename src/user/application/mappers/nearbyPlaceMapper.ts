// Description: Maps nearby page, shop, and business records from WoWonder into discovery places.
import type { RawApiRecord } from '../../../shared-kernel/domain/types/api.types';
import { normalizeRawUrl } from '../../../foundation/application/normalizers/url';
import {
  asNumber,
  asRecord,
  firstBoolean,
  firstEntityId,
  firstString,
} from '../../../foundation/application/normalizers/resolveValue';
import type {
  NearbyPlace,
  NearbyPlaceKind,
} from '../../domain/types/user.types';

function mapCoordinate(...records: Array<RawApiRecord | undefined>) {
  for (const record of records) {
    if (!record) continue;

    const latitude =
      asNumber(record.lat) ??
      asNumber(record.latitude) ??
      asNumber(record.page_lat);
    const longitude =
      asNumber(record.lng) ??
      asNumber(record.longitude) ??
      asNumber(record.page_lng);

    if (
      latitude === undefined ||
      longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      continue;
    }

    return { latitude, longitude };
  }

  return undefined;
}

function removeMentionPrefix(value: string | undefined) {
  return value?.replace(/^@/, '');
}

function normalizeMapPinStatus(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'on', 'pin', 'pinned'].includes(normalized)) {
    return 'approved';
  }
  return normalized;
}

function firstStringFromRecords(
  records: Array<RawApiRecord | undefined>,
  keys: string[],
) {
  for (const record of records) {
    if (!record) continue;
    const value = firstString(record, keys);
    if (value !== undefined) return value;
  }
  return undefined;
}

function firstPinApprovedFlag(records: Array<RawApiRecord | undefined>) {
  const keys = [
    'pinned',
    'is_pinned',
    'isPinned',
    'map_pin_approved',
    'mapPinApproved',
  ];
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const rawValue = record[key];
      const booleanValue = firstBoolean(record, [key]);
      if (booleanValue !== undefined) return booleanValue;
      if (typeof rawValue === 'string') {
        const normalized = rawValue.trim().toLowerCase();
        if (['approved', 'pin', 'pinned'].includes(normalized)) return true;
        if (['pending', 'rejected', 'none'].includes(normalized)) return false;
      }
    }
  }
  return undefined;
}

function firstNumberFromRecords(
  records: Array<RawApiRecord | undefined>,
  keys: string[],
) {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = asNumber(record[key]);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

function firstBooleanFromRecords(
  records: Array<RawApiRecord | undefined>,
  keys: string[],
) {
  for (const record of records) {
    if (!record) continue;
    const value = firstBoolean(record, keys);
    if (value !== undefined) return value;
  }
  return undefined;
}

function mapOwner(
  records: Array<RawApiRecord | undefined>,
  webBaseUrl: string,
  mediaBaseUrl: string,
) {
  const owner =
    records
      .map(
        record =>
          asRecord(record?.user_data) ||
          asRecord(record?.owner) ||
          asRecord(record?.publisher),
      )
      .find(Boolean) || undefined;
  const ownerId =
    firstStringFromRecords(
      [owner, ...records],
      ['user_id', 'owner_id', 'id'],
    ) || firstEntityId(owner ?? {}, ['user_id', 'id']);
  const firstName = firstString(owner ?? {}, ['first_name']);
  const lastName = firstString(owner ?? {}, ['last_name']);
  const ownerUsername = firstStringFromRecords(
    [owner, ...records],
    ['owner_username', 'username', 'user_name'],
  );
  const ownerName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    firstStringFromRecords(
      [owner, ...records],
      ['owner_name', 'name', 'full_name'],
    ) ||
    ownerUsername;

  return {
    ownerId,
    ownerName,
    ownerUsername,
    ownerAvatarUrl: normalizeRawUrl(
      firstStringFromRecords(
        [owner, ...records],
        ['owner_avatar', 'avatar', 'profile_picture'],
      ),
      webBaseUrl,
      mediaBaseUrl,
    ),
  };
}

export function mapNearbyPlace(
  record: RawApiRecord,
  kind: NearbyPlaceKind,
  webBaseUrl: string,
  mediaBaseUrl = webBaseUrl,
): NearbyPlace | null {
  const page = asRecord(record.page_data);
  const detail = asRecord(kind === 'shop' ? record.product : record.job);

  if (!page) {
    return null;
  }

  const pageId = firstEntityId(page, ['page_id', 'id']);
  const detailId = firstEntityId(detail ?? {}, ['id']);
  const name = firstString(page, ['name', 'page_title', 'title']);
  const records = [record, page, detail];
  const owner = mapOwner(records, webBaseUrl, mediaBaseUrl);

  if (!name) {
    return null;
  }

  return {
    id: `${kind}:${pageId ?? detailId ?? name}`,
    pageId,
    kind,
    name,
    username: firstString(page, ['username', 'page_name']),
    avatarUrl: normalizeRawUrl(
      firstString(page, ['avatar', 'page_avatar']),
      webBaseUrl,
      mediaBaseUrl,
    ),
    coverUrl: normalizeRawUrl(
      firstString(page, ['cover']),
      webBaseUrl,
      mediaBaseUrl,
    ),
    url: normalizeRawUrl(firstString(page, ['url']), webBaseUrl),
    category: firstString(page, [
      'category',
      'page_sub_category',
      'page_category',
    ]),
    description: firstString(page, ['page_description', 'about']),
    location:
      firstString(detail ?? {}, ['location']) || firstString(page, ['address']),
    distance: asNumber(record.distance),
    likes: firstNumberFromRecords(records, [
      'likes_count',
      'likes',
      'page_likes',
      'like_count',
    ]),
    followersCount: firstNumberFromRecords(records, [
      'followers_count',
      'followers',
      'follow_count',
    ]),
    postCount: firstNumberFromRecords(records, ['post_count', 'posts_count']),
    isFollowing: firstBooleanFromRecords(records, [
      'is_following',
      'following',
    ]),
    isLiked: firstBooleanFromRecords(records, ['is_liked']),
    ...owner,
    coordinate: mapCoordinate(detail),
  };
}

export function mapNearbyPage(
  record: RawApiRecord,
  webBaseUrl: string,
  mediaBaseUrl = webBaseUrl,
): NearbyPlace | null {
  const page = asRecord(record.page_data);
  const records = [record, page];
  const pageId =
    firstEntityId(record, ['id', 'page_id']) ??
    (page ? firstEntityId(page, ['id', 'page_id']) : undefined);
  const name = firstStringFromRecords(records, ['title', 'page_title', 'name']);
  const mapPinStatus = normalizeMapPinStatus(
    firstStringFromRecords(records, [
      'map_pin_status',
      'mapPinStatus',
      'pin_status',
      'pinStatus',
      'map_pin',
      'mapPin',
      'pin',
    ]),
  );
  const pinnedFlag = firstPinApprovedFlag(records);
  const isPinApproved = mapPinStatus === 'approved' || pinnedFlag === true;
  const owner = mapOwner(records, webBaseUrl, mediaBaseUrl);

  if (!name) {
    return null;
  }

  const distanceMeters = asNumber(record.distance_meters);

  return {
    id: `page:${pageId ?? name}`,
    pageId,
    kind: 'page',
    source: 'page',
    placeId: firstStringFromRecords(records, ['place_id', 'placeId']),
    name,
    username: removeMentionPrefix(
      firstStringFromRecords(records, ['subtitle', 'page_name', 'username']),
    ),
    avatarUrl: normalizeRawUrl(
      firstStringFromRecords(records, ['avatar', 'page_avatar']),
      webBaseUrl,
      mediaBaseUrl,
    ),
    coverUrl: normalizeRawUrl(
      firstStringFromRecords(records, ['cover', 'page_cover']),
      webBaseUrl,
      mediaBaseUrl,
    ),
    url: normalizeRawUrl(firstStringFromRecords(records, ['url']), webBaseUrl),
    description: firstStringFromRecords(records, [
      'description',
      'page_description',
    ]),
    location: firstStringFromRecords(records, ['location', 'address']),
    distance: distanceMeters === undefined ? undefined : distanceMeters / 1000,
    distanceMeters,
    likes: firstNumberFromRecords(records, [
      'likes_count',
      'likes',
      'page_likes',
      'like_count',
    ]),
    followersCount: firstNumberFromRecords(records, [
      'followers_count',
      'followers',
      'follow_count',
    ]),
    postCount: firstNumberFromRecords(records, ['post_count', 'posts_count']),
    isFollowing: firstBooleanFromRecords(records, [
      'is_following',
      'following',
    ]),
    isLiked: firstBooleanFromRecords(records, ['is_liked']),
    ...owner,
    mapPinStatus,
    mapPinApproved: isPinApproved,
    isPinned: isPinApproved,
    coordinate: mapCoordinate(record, page),
  };
}
