// Description: Verifies LiveKit call API response mappers for the Messages context.
import {
  mapIncomingLiveKitCall,
  mapLiveKitCheckResponse,
  mapLiveKitCreateResponse,
  mapLiveKitJoinPayload,
} from '../liveKitCallMapper';

describe('liveKitCallMapper', () => {
  it('maps outgoing call creation responses', () => {
    expect(
      mapLiveKitCreateResponse({
        id: 88,
        call_type: 'audio',
        provider: 'livekit',
        room_name: 'room-a',
        call_status: 'calling',
        busy: '0',
        peer: {
          user_id: 12,
          name: 'Receiver',
          avatar: 'https://cdn.vnseea.vn/avatar.jpg',
        },
      }),
    ).toEqual({
      callId: '88',
      callType: 'audio',
      provider: 'livekit',
      roomName: 'room-a',
      status: 'calling',
      busy: false,
      peer: {
        id: '12',
        name: 'Receiver',
        avatar: 'https://cdn.vnseea.vn/avatar.jpg',
        username: '',
      },
    });
  });

  it('maps check responses and server timing', () => {
    expect(
      mapLiveKitCheckResponse({
        call_id: '91',
        call_type: 'video',
        call_status: 'no_answer',
        active: 0,
        started_at: 1700000000,
        server_now: 1700000042,
        elapsed: 42,
      }),
    ).toEqual({
      callId: '91',
      callType: 'video',
      status: 'no_answer',
      active: false,
      finished: true,
      startedAt: 1700000000,
      serverNow: 1700000042,
      elapsedSeconds: 42,
    });
  });

  it('maps join payload without exposing backend secrets', () => {
    const payload = mapLiveKitJoinPayload({
      call: {
        id: 90,
        type: 'video',
        room_name: 'wowonderhash',
        source_room_name: 'raw-room',
        status: 'answered',
        started_at: '1700000000',
      },
      current_user: { id: 1, name: 'Admin', avatar: 'me.jpg' },
      peer: { id: 2, name: 'Friend', avatar: 'peer.jpg' },
      server_now: 1700000015,
      elapsed: 15,
      livekit: {
        ws_url: 'wss://livekit.vnseea.vn',
        token: 'jwt-token',
        api_secret: 'must-not-map',
      },
    });

    expect(payload.wsUrl).toBe('wss://livekit.vnseea.vn');
    expect(payload.token).toBe('jwt-token');
    expect(payload.serverNow).toBe(1700000015);
    expect(payload.elapsedSeconds).toBe(15);
    expect(JSON.stringify(payload)).not.toContain('must-not-map');
  });

  it('maps missing incoming calls as null', () => {
    expect(mapIncomingLiveKitCall({ incoming_call: null })).toBeNull();
  });
});
