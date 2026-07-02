const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('backend LiveKit call debug instrumentation', () => {
  it('logs answer, payload, and check boundaries without exposing secrets', () => {
    const source = read('phtml/api/v2/endpoints/livekit.php');

    expect(source).toContain('[vnseea_call_debug]');
    expect(source).toContain('vnseea_call_debug.log');
    expect(source).toContain("'/../../../xhr/logs'");
    expect(source).toContain('file_put_contents($log_file');
    expect(source).toContain('FILE_APPEND | LOCK_EX');
    expect(source).toContain("Wo_ApiLiveKitDebugLog('answer'");
    expect(source).toContain("'affected_rows' => $answered_rows");
    expect(source).toContain("Wo_ApiLiveKitDebugLog('payload'");
    expect(source).toContain("'raw_room_name' => $room_request");
    expect(source).toContain("'livekit_room' => $room_name");
    expect(source).toContain("'token_room' => $payload['video']['room']");
    expect(source).toContain("Wo_ApiLiveKitDebugLog('check'");
    expect(source).toContain("'started_at' => $timing['started_at']");
    expect(source).toContain("'elapsed' => $timing['elapsed']");
    expect(source).not.toContain("'token' => $payload");
    expect(source).not.toContain("'api_secret' => $api_secret");
  });

  it('writes live stream backend lifecycle logs to the same call debug file', () => {
    const functionsSource = read('phtml/assets/includes/functions_two.php');
    const liveSource = read('phtml/xhr/live.php');

    expect(functionsSource).toContain('function Wo_VnseeaCallDebugLog');
    expect(functionsSource).toContain("'/../../xhr/logs'");
    expect(functionsSource).toContain("'vnseea_call_debug.log'");
    expect(functionsSource).toContain('FILE_APPEND | LOCK_EX');

    expect(liveSource).toContain("Wo_VnseeaCallDebugLog('live_bootstrap'");
    expect(liveSource).toContain("Wo_VnseeaCallDebugLog('live_create'");
    expect(liveSource).toContain("Wo_VnseeaCallDebugLog('live_join'");
    expect(liveSource).toContain("'role' => 'host'");
    expect(liveSource).toContain("'role' => 'viewer'");
    expect(liveSource).toContain("'room_name' => $join_payload['room_name']");
    expect(liveSource).not.toContain("'token' => $join_payload['token']");
  });
});
