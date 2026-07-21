// Description: Keeps large profile connection lists out of navigation params.
import type { UserProfile } from '../../../user/domain/types/user.types';

type ProfileConnectionsSnapshot = {
  followers: UserProfile[];
  following: UserProfile[];
  savedAt: number;
};

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const snapshots = new Map<string, ProfileConnectionsSnapshot>();

function getSnapshotKey(userId: string) {
  return String(userId).trim();
}

export function setProfileConnectionsSnapshot(
  userId: string,
  followers: UserProfile[],
  following: UserProfile[],
) {
  const key = getSnapshotKey(userId);
  if (!key) return;

  snapshots.set(key, {
    followers,
    following,
    savedAt: Date.now(),
  });
}

export function getProfileConnectionsSnapshot(userId: string) {
  const key = getSnapshotKey(userId);
  const snapshot = snapshots.get(key);
  if (!snapshot) return undefined;

  if (Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) {
    snapshots.delete(key);
    return undefined;
  }

  return snapshot;
}
