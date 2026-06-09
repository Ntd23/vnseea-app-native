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
  const pageId = firstEntityId(record, ['id', 'page_id']);
  const name = firstString(record, ['title', 'page_title', 'name']);
  const mapPinStatus = firstString(record, [
    'map_pin_status',
    'mapPinStatus',
    'pin_status',
  ]);
  const pinnedFlag = firstBoolean(record, [
    'pinned',
    'is_pinned',
    'isPinned',
    'map_pin_approved',
    'mapPinApproved',
  ]);

  if (!name) {
    return null;
  }

  const distanceMeters = asNumber(record.distance_meters);

  return {
    id: `page:${pageId ?? name}`,
    pageId,
    kind: 'page',
    source: 'page',
    placeId: firstString(record, ['place_id', 'placeId']),
    name,
    username: removeMentionPrefix(
      firstString(record, ['subtitle', 'page_name', 'username']),
    ),
    avatarUrl: normalizeRawUrl(
      firstString(record, ['avatar', 'page_avatar']),
      webBaseUrl,
    ),
    url: normalizeRawUrl(firstString(record, ['url']), webBaseUrl),
    description: firstString(record, ['description', 'page_description']),
    location: firstString(record, ['location', 'address']),
    distance: distanceMeters === undefined ? undefined : distanceMeters / 1000,
    distanceMeters,
    mapPinStatus,
    mapPinApproved: mapPinStatus === 'approved' || pinnedFlag === true,
    isPinned: mapPinStatus === 'approved' || pinnedFlag === true,
    coordinate: mapCoordinate(record),
  };
}
