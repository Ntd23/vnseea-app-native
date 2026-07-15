import type { GroupLiveKitParticipant } from '../../domain/types/groupCall.types';

const PARTICIPANT_FIELDS: ReadonlyArray<keyof GroupLiveKitParticipant> = [
  'id',
  'name',
  'avatar',
  'username',
  'joinedAt',
  'isLocal',
  'isMicrophoneMuted',
  'isCameraMuted',
];

export function areGroupParticipantListsEqual(
  first: readonly GroupLiveKitParticipant[],
  second: readonly GroupLiveKitParticipant[],
): boolean {
  if (first === second) return true;
  if (first.length !== second.length) return false;

  return first.every((participant, index) => {
    const other = second[index];
    return PARTICIPANT_FIELDS.every(
      field => participant[field] === other?.[field],
    );
  });
}

export function reconcileLiveKitParticipants(
  current: readonly GroupLiveKitParticipant[],
  liveKitParticipants: readonly GroupLiveKitParticipant[],
): GroupLiveKitParticipant[] {
  const currentById = new Map(current.map(item => [item.id, item]));
  const next = liveKitParticipants.map(participant => {
    const existing = currentById.get(participant.id);
    if (!existing) return participant;

    return {
      ...existing,
      ...participant,
      name: participant.name || existing.name,
      avatar: participant.avatar || existing.avatar,
      username: participant.username || existing.username,
      joinedAt: participant.joinedAt || existing.joinedAt,
    };
  });

  return areGroupParticipantListsEqual(current, next)
    ? (current as GroupLiveKitParticipant[])
    : next;
}

export function mergeGroupParticipantMetadata(
  current: readonly GroupLiveKitParticipant[],
  serverParticipants: readonly GroupLiveKitParticipant[],
): GroupLiveKitParticipant[] {
  const serverById = new Map(serverParticipants.map(item => [item.id, item]));
  const next = current.map(participant => {
    const serverParticipant = serverById.get(participant.id);
    if (!serverParticipant) return participant;

    return {
      ...participant,
      name: serverParticipant.name || participant.name,
      avatar: serverParticipant.avatar || participant.avatar,
      username: serverParticipant.username || participant.username,
      joinedAt: serverParticipant.joinedAt || participant.joinedAt,
    };
  });

  return areGroupParticipantListsEqual(current, next)
    ? (current as GroupLiveKitParticipant[])
    : next;
}
