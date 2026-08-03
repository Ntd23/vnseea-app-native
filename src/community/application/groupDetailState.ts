import type { GroupMembershipStatus } from '../domain/types/community.types';

type RawGroupState = Record<string, unknown>;

const GROUP_MEMBERSHIP_STATUSES = new Set<GroupMembershipStatus>([
  'owner',
  'joined',
  'requested',
  'not_joined',
]);

function isTruthy(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

export function resolveGroupMembershipStatus(
  raw: RawGroupState | undefined,
): GroupMembershipStatus {
  if (!raw) return 'not_joined';

  const canonicalStatus = String(raw.membership_status ?? '').trim();
  if (
    GROUP_MEMBERSHIP_STATUSES.has(
      canonicalStatus as GroupMembershipStatus,
    )
  ) {
    return canonicalStatus as GroupMembershipStatus;
  }

  if (isTruthy(raw.is_owner)) {
    return 'owner';
  }

  const legacyStatus = raw.is_group_joined ?? raw.is_joined;
  if (legacyStatus === 2 || legacyStatus === '2') {
    return 'requested';
  }
  if (isTruthy(legacyStatus)) {
    return 'joined';
  }

  return 'not_joined';
}

export function normalizeHostedMediaUrl(
  value: string | undefined,
  webBaseUrl: string,
  mediaBaseUrl = webBaseUrl,
): string {
  const mediaUrl = value?.trim();
  if (!mediaUrl) return '';

  const baseUrl = new URL(webBaseUrl);
  const normalizedValue = mediaUrl.replace(/^\/+/, '');
  const resolutionBase = /^upload\//i.test(normalizedValue)
    ? new URL(mediaBaseUrl)
    : baseUrl;
  const absoluteUrl = mediaUrl.startsWith('//')
    ? `${baseUrl.protocol}${mediaUrl}`
    : mediaUrl;

  try {
    const resolved = new URL(absoluteUrl, `${resolutionBase.origin}/`);
    if (
      resolved.protocol === 'http:' &&
      baseUrl.protocol === 'https:' &&
      resolved.hostname.toLowerCase() === baseUrl.hostname.toLowerCase()
    ) {
      resolved.protocol = 'https:';
    }
    return resolved.toString();
  } catch {
    return '';
  }
}
