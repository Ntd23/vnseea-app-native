type ProfileOwnershipInput = {
  currentUserId?: string | number | null;
  routeUserId?: string | number | null;
  loadedProfileId?: string | number | null;
};

function normalizeUserId(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveProfileOwnership({
  currentUserId,
  routeUserId,
  loadedProfileId,
}: ProfileOwnershipInput) {
  const authenticatedUserId = normalizeUserId(currentUserId);
  if (!authenticatedUserId) return false;

  const targetUserId =
    normalizeUserId(routeUserId) ??
    normalizeUserId(loadedProfileId) ??
    authenticatedUserId;

  return targetUserId === authenticatedUserId;
}
