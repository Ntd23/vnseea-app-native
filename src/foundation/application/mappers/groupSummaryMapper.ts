// Description: Maps raw group-like records into shared group summary objects.
import type {
  RawRecord,
  GroupSummary,
} from '../../domain/types/foundation.types';
import {
  firstBoolean,
  firstEntityId,
  firstString,
} from '../normalizers/resolveValue';
import { normalizeRawUrl } from '../normalizers/url';

export function mapGroupSummary(
  record: RawRecord,
  webBaseUrl: string,
): GroupSummary {
  return {
    id: firstEntityId(record, ['group_id', 'id']),
    name: firstString(record, ['group_title', 'name', 'title']),
    username: firstString(record, ['group_name', 'username']),
    avatarUrl: normalizeRawUrl(
      firstString(record, ['avatar', 'group_avatar']),
      webBaseUrl,
    ),
    coverUrl: normalizeRawUrl(
      firstString(record, ['cover', 'group_cover']),
      webBaseUrl,
    ),
    joined: firstBoolean(record, ['is_joined', 'joined']),
  };
}
