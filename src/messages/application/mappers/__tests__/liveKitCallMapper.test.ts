// Description: Verifies LiveKit call API response mappers for the Messages context.
import {
  mapCallDeliveryState,
  mapIncomingLiveKitCall,
  mapLiveKitCheckResponse,
  mapLiveKitCreateResponse,
  mapLiveKitJoinPayload,
} from '../liveKitCallMapper';

describe('liveKitCallMapper', () => {
  it('does not show a delivery failure for transitional responses without diagnostics', () => {
    expect(mapCallDeliveryState(undefined)).toEqual({
      state: 'accepted',
      channels: {
        realtime: 'unavailable',
        onesignal: 'unavailable',
        voip: 'unavailable',
      },
    });
  });

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
        delivery: {
          state: 'failed',
          channels: {
            realtime: 'failed',
            onesignal: 'unavailable',
            voip: 'failed',
          },
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
      delivery: {
        state: 'failed',
        channels: {
          realtime: 'failed',
          onesignal: 'unavailable',
          voip: 'failed',
        },
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
      startedAtMs: 1700000000000,
      serverNow: 1700000042,
      serverNowMs: 1700000042000,
      elapsedSeconds: 42,
      elapsedMs: 42000,
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

  it('rejects join payloads without LiveKit connection details', () => {
    expect(() =>
      mapLiveKitJoinPayload({
        call: {
          id: 1286,
          type: 'audio',
          room_name: '',
          status: 'answered',
        },
        livekit: {
          ws_url: '',
          token: '',
        },
      }),
    ).toThrow(/missing livekit join payload/i);
  });

  it('rejects join payloads that backend marks as not ready', () => {
    expect(() =>
      mapLiveKitJoinPayload({
        join_ready: false,
        message: 'Call is not ready to join.',
      }),
    ).toThrow(/not ready/i);
  });

  it('maps missing incoming calls as null', () => {
    expect(mapIncomingLiveKitCall({ incoming_call: null })).toBeNull();
  });
});
