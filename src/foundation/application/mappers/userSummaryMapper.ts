// Description: Maps raw user-like records into shared user summary objects.
import type {
  RawRecord,
  UserSummary,
} from '../../domain/types/foundation.types';
import {
  firstBoolean,
  firstEntityId,
  firstString,
} from '../normalizers/resolveValue';
import { normalizeRawUrl } from '../normalizers/url';

export function mapUserSummary(
  record: RawRecord,
  webBaseUrl: string,
  mediaBaseUrl = webBaseUrl,
): UserSummary {
  return {
    id: firstEntityId(record, ['user_id', 'id']),
    username: firstString(record, ['username', 'user_name']),
    name: firstString(record, ['name', 'full_name']),
    avatarUrl: normalizeRawUrl(
      firstString(record, ['avatar', 'avatar_url', 'profile_picture']),
      webBaseUrl,
      mediaBaseUrl,
    ),
    verified: firstBoolean(record, ['verified', 'is_verified']),
  };
}
