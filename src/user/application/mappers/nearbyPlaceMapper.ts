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

function mapCoordinate(record: RawApiRecord | undefined) {
  const latitude = asNumber(record?.lat);
  const longitude = asNumber(record?.lng);

  if (
    latitude === undefined ||
    longitude === undefined ||
    (latitude === 0 && longitude === 0)
  ) {
    return undefined;
  }

  return { latitude, longitude };
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

export function mapNearbyPlace(
  record: RawApiRecord,
  kind: NearbyPlaceKind,
  webBaseUrl: string,
): NearbyPlace | null {
  const page = asRecord(record.page_data);
  const detail = asRecord(kind === 'shop' ? record.product : record.job);

  if (!page) {
    return null;
  }

  const pageId = firstEntityId(page, ['page_id', 'id']);
  const detailId = firstEntityId(detail ?? {}, ['id']);
  const name = firstString(page, ['name', 'page_title', 'title']);

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
    coordinate: mapCoordinate(detail),
  };
}

export function mapNearbyPage(
  record: RawApiRecord,
  webBaseUrl: string,
): NearbyPlace | null {
  const page = asRecord(record.page_data);
  const records = [record, page];
  const pageId = firstEntityId(record, ['id', 'page_id']);
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
    ),
    url: normalizeRawUrl(firstStringFromRecords(records, ['url']), webBaseUrl),
    description: firstStringFromRecords(records, [
      'description',
      'page_description',
    ]),
    location: firstStringFromRecords(records, ['location', 'address']),
    distance: distanceMeters === undefined ? undefined : distanceMeters / 1000,
    distanceMeters,
    mapPinStatus,
    mapPinApproved: isPinApproved,
    isPinned: isPinApproved,
    coordinate: mapCoordinate(record),
  };
}
