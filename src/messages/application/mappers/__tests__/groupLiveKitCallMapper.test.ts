// Description: Verifies LiveKit group call response mapping for the Messages context.
import {
  mapAddedGroupLiveKitMembers,
  mapGroupLiveKitCandidates,
  mapGroupLiveKitJoinPayload,
  mapIncomingGroupLiveKitCall,
} from '../groupLiveKitCallMapper';

describe('groupLiveKitCallMapper', () => {
  it('maps a group call join payload without exposing backend secrets', () => {
    const payload = mapGroupLiveKitJoinPayload({
      call: {
        id: '12',
        group_id: '7',
        call_type: 'video',
        room_name: 'wowonder_groupcall_7_abc',
        status: 'active',
        started_at: 100,
        server_now: 140,
        participant_count: 2,
      },
      group: {
        id: '7',
        name: 'Design',
        avatar: 'https://example.com/group.jpg',
      },
      current_user: {
        id: '1',
        name: 'Admin',
        avatar: 'https://example.com/me.jpg',
      },
      livekit: {
        ws_url: 'wss://livekit.vnseea.vn',
        token: 'join-token',
      },
      participants: [
        {
          id: '1',
          name: 'Admin',
          avatar: 'https://example.com/me.jpg',
          joined_at: 100,
        },
      ],
    });

    expect(payload.call.id).toBe('12');
    expect(payload.group.id).toBe('7');
    expect(payload.wsUrl).toBe('wss://livekit.vnseea.vn');
    expect(payload.token).toBe('join-token');
    expect(payload.elapsedSeconds).toBe(40);
    expect(JSON.stringify(payload)).not.toContain('api_secret');
  });

  it('maps incoming group calls and null incoming state', () => {
    expect(mapIncomingGroupLiveKitCall({ incoming_call: null })).toBeNull();
    expect(
      mapIncomingGroupLiveKitCall({
        incoming_call: {
          call_id: '5',
          group_id: '9',
          call_type: 'audio',
          group: { id: '9', name: 'Team' },
          caller: { id: '2', name: 'Dung' },
        },
      }),
    ).toMatchObject({
      callId: '5',
      groupId: '9',
      callType: 'audio',
      group: { name: 'Team' },
      caller: { name: 'Dung' },
    });
  });

  it('maps candidates and added member ids', () => {
    expect(
      mapGroupLiveKitCandidates({
        candidates: [{ id: 3, name: 'Member' }],
      }),
    ).toEqual([
      expect.objectContaining({
        id: '3',
        name: 'Member',
      }),
    ]);
    expect(
      mapAddedGroupLiveKitMembers({
        invited_user_ids: [3, '4'],
      }),
    ).toEqual(['3', '4']);
  });
});
