const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('backend APNs VoIP config wiring', () => {
  it('adds APNs VoIP config defaults for legacy PHP backend', () => {
    const source = read('phtml/assets/includes/app_start.php');

    expect(source).toContain("'ios_voip_team_id' => ''");
    expect(source).toContain("'ios_voip_key_id' => ''");
    expect(source).toContain("'ios_voip_bundle_id' => ''");
    expect(source).toContain("'ios_voip_private_key_path' => ''");
    expect(source).toContain("'ios_voip_apns_environment' => 'production'");
    expect(source).toContain("'ios_voip_enabled' => '0'");
  });

  it('renders APNs VoIP fields in LiveKit Call Settings', () => {
    const source = read('phtml/admin-panel/pages/video-settings/content.phtml');

    expect(source).toContain('name="ios_voip_enabled"');
    expect(source).toContain('id="chck-ios_voip_enabled"');
    expect(source).toContain('name="ios_voip_team_id"');
    expect(source).toContain('$wo[\'config\'][\'ios_voip_team_id\']');
    expect(source).toContain('name="ios_voip_key_id"');
    expect(source).toContain('$wo[\'config\'][\'ios_voip_key_id\']');
    expect(source).toContain('name="ios_voip_bundle_id"');
    expect(source).toContain('$wo[\'config\'][\'ios_voip_bundle_id\']');
    expect(source).toContain('name="ios_voip_private_key_path"');
    expect(source).toContain('$wo[\'config\'][\'ios_voip_private_key_path\']');
    expect(source).toContain('name="ios_voip_apns_environment"');
    expect(source).toContain('value="production"');
    expect(source).toContain('value="sandbox"');
  });

  it('uses a shared APNs VoIP helper with environment, expiration, logging, and token cleanup', () => {
    const source = read('phtml/assets/includes/functions_two.php');

    expect(source).toContain('function Wo_ApiSendApnsVoipPush');
    expect(source).toContain('ios_voip_enabled');
    expect(source).toContain('ios_voip_apns_environment');
    expect(source).toContain('https://api.sandbox.push.apple.com/3/device/');
    expect(source).toContain('https://api.push.apple.com/3/device/');
    expect(source).toContain("apns-expiration: ' . (time() + 45)");
    expect(source).toContain('[voip_apns] context=');
    expect(source).toContain('apns-id');
    expect(source).toContain('Unregistered');
    expect(source).toContain('BadDeviceToken');
    expect(source).toContain("SET `ios_voip_token` = ''");
  });

  it('routes direct and group call VoIP sends through the shared helper', () => {
    const livekit = read('phtml/api/v2/endpoints/livekit.php');
    expect(
      fs.existsSync(
        path.join(
          root,
          'phtml/assets/includes/vnseea_livekit_call.php',
        ),
      ),
    ).toBe(true);
    const directCallService = read(
      'phtml/assets/includes/vnseea_livekit_call.php',
    );
    const groupCall = read('phtml/api/v2/endpoints/group_call.php');

    expect(directCallService).toContain(
      "Wo_ApiSendApnsVoipPush($recipient, $notification_data, $caller_name, $call_type, 'direct')",
    );
    expect(livekit).toContain('Wo_SendCanonicalLiveKitCallPush(');
    expect(groupCall).toContain(
      "Wo_ApiSendApnsVoipPush($recipient, $notification_data, $display_name, $call_type, 'group')",
    );
    expect(directCallService).not.toContain(
      'https://api.push.apple.com/3/device/',
    );
    expect(livekit).not.toContain('https://api.push.apple.com/3/device/');
    expect(groupCall).not.toContain('https://api.push.apple.com/3/device/');
  });

  it('sends a direct VoIP close push when a LiveKit call is cancelled, declined, ended, or no-answer', () => {
    const livekit = read('phtml/api/v2/endpoints/livekit.php');

    expect(livekit).toContain('function Wo_ApiLiveKitSendCloseVoipPush');
    expect(livekit).toContain("'event_type' => 'livekit_call_closed'");
    expect(livekit).toContain("'status' => $final_status");
    expect(livekit).toContain("'closed_by' => (string) $actor_id");
    expect(livekit).toContain('Wo_ApiLiveKitSendCloseVoipPush($call_source, $call_type, $final_status, $actor_id)');
    expect(livekit).toContain("Wo_ApiLiveKitSendCloseVoipPush($call_source, $call_type, 'no_answer', intval($wo['user']['user_id']))");
    expect(livekit).toContain("Wo_ApiLiveKitDebugLog('close_voip_push'");
  });
});
