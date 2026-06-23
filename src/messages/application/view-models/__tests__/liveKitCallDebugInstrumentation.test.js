const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('LiveKit CallKit debug instrumentation', () => {
  it('logs the CallKit answer, payload, room, participant, track, and local media boundaries', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('[VNSEEA_CALL_DEBUG]');
    expect(source).toContain("logCallDebug('media_permission_result'");
    expect(source).toContain("logCallDebug('callkit_answer_start'");
    expect(source).toContain("logCallDebug('answer_request'");
    expect(source).toContain("logCallDebug('answer_response'");
    expect(source).toContain("logCallDebug('answer_error'");
    expect(source).toContain("logCallDebug('payload_request'");
    expect(source).toContain("logCallDebug('payload_response'");
    expect(source).toContain("logCallDebug('payload_error'");
    expect(source).toContain("logCallDebug('room_connect_start'");
    expect(source).toContain("logCallDebug('room_connect_success'");
    expect(source).toContain("logCallDebug('room_connected'");
    expect(source).toContain("logCallDebug('participant_connected'");
    expect(source).toContain("logCallDebug('track_subscribed'");
    expect(source).toContain("logCallDebug('local_microphone_enable_start'");
    expect(source).toContain("logCallDebug('local_microphone_enabled'");
    expect(source).toContain("logCallDebug('local_camera_enable_start'");
    expect(source).toContain("logCallDebug('local_camera_enabled'");
    expect(source).toContain("logCallDebug('room_connect_error'");
    expect(source).toContain("logCallDebug('check_response'");
    expect(source).toContain("logCallDebug('incoming_boot_error'");
  });

  it('does not log the full LiveKit JWT token', () => {
    const source = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );

    expect(source).toContain('tokenLength');
    expect(source).not.toContain('token: nextPayload.token');
  });
});
