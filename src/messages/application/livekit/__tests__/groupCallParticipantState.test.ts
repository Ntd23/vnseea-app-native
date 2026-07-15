import type { GroupLiveKitParticipant } from '../../../domain/types/groupCall.types';
import {
  areGroupParticipantListsEqual,
  mergeGroupParticipantMetadata,
  reconcileLiveKitParticipants,
} from '../groupCallParticipantState';

function participant(
  id: string,
  overrides: Partial<GroupLiveKitParticipant> = {},
): GroupLiveKitParticipant {
  return {
    id,
    name: `User ${id}`,
    avatar: '',
    username: `user_${id}`,
    joinedAt: 1,
    ...overrides,
  };
}

describe('group call participant ownership', () => {
  it('merges server metadata without changing LiveKit membership or order', () => {
    const current = [
      participant('1', {
        isLocal: true,
        isCameraMuted: false,
        isMicrophoneMuted: false,
      }),
      participant('2', { isCameraMuted: false }),
    ];
    const server = [
      participant('2', { name: 'Remote renamed', isCameraMuted: true }),
      participant('3', { name: 'Server-only participant' }),
    ];

    const result = mergeGroupParticipantMetadata(current, server);

    expect(result.map(item => item.id)).toEqual(['1', '2']);
    expect(result[1]).toEqual(
      expect.objectContaining({
        name: 'Remote renamed',
        isCameraMuted: false,
      }),
    );
    expect(result[0].isLocal).toBe(true);
  });

  it('uses the LiveKit participant list as membership authority', () => {
    const current = [
      participant('1', { name: 'Local server name', isLocal: true }),
      participant('2'),
    ];
    const liveKitParticipants = [
      participant('1', {
        name: '',
        isLocal: true,
        isCameraMuted: false,
      }),
    ];

    const result = reconcileLiveKitParticipants(
      current,
      liveKitParticipants,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: '1',
        name: 'Local server name',
        isLocal: true,
        isCameraMuted: false,
      }),
    );
  });

  it('detects semantically unchanged participant lists', () => {
    const first = [participant('1', { isLocal: true })];
    const second = [participant('1', { isLocal: true })];

    expect(areGroupParticipantListsEqual(first, second)).toBe(true);
    expect(
      areGroupParticipantListsEqual(first, [
        participant('1', { isLocal: true, isCameraMuted: true }),
      ]),
    ).toBe(false);
  });
});
