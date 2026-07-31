export const SELF_GROUP_MEMBER_REMOVAL_MESSAGE =
  'Bạn không thể tự xóa mình khỏi nhóm. Hãy dùng chức năng Thoát nhóm.';

function normalizeUserId(value: string | number | null | undefined): string {
  return String(value ?? '').trim();
}

export function isSelfGroupMemberRemoval(
  currentUserId: string | number | null | undefined,
  targetUserId: string | number | null | undefined,
): boolean {
  const current = normalizeUserId(currentUserId);
  const target = normalizeUserId(targetUserId);
  return Boolean(current && target && current === target);
}

export function assertNotSelfGroupMemberRemoval(
  currentUserId: string | number | null | undefined,
  targetUserId: string | number | null | undefined,
  message = SELF_GROUP_MEMBER_REMOVAL_MESSAGE,
): void {
  if (isSelfGroupMemberRemoval(currentUserId, targetUserId)) {
    throw new Error(message);
  }
}
