// Description: Maps raw page-like records into shared page summary objects.
import type {
  RawRecord,
  PageSummary,
} from '../../domain/types/foundation.types';
import {
  firstBoolean,
  firstEntityId,
  firstString,
} from '../normalizers/resolveValue';
import { normalizeRawUrl } from '../normalizers/url';

export function mapPageSummary(
  record: RawRecord,
  webBaseUrl: string,
): PageSummary {
  return {
    id: firstEntityId(record, ['page_id', 'id']),
    name: firstString(record, ['page_title', 'name', 'title']),
    username: firstString(record, ['page_name', 'username']),
    avatarUrl: normalizeRawUrl(
      firstString(record, ['avatar', 'page_avatar']),
      webBaseUrl,
    ),
    coverUrl: normalizeRawUrl(
      firstString(record, ['cover', 'page_cover']),
      webBaseUrl,
    ),
    liked: firstBoolean(record, ['is_liked', 'liked']),
  };
}
