const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextFunction = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, nextFunction > start ? nextFunction : undefined);
}

describe('backend LiveKit call payload and native action state', () => {
  it('builds direct CallKit payload with stable uuid, action token, expiry, and mobile API URL', () => {
    const source = read('phtml/api/v2/endpoints/livekit.php');
    expect(
      fs.existsSync(
        path.join(
          root,
          'phtml/assets/includes/vnseea_livekit_call.php',
        ),
      ),
    ).toBe(true);
    const service = read('phtml/assets/includes/vnseea_livekit_call.php');
    const sender = functionBody(service, 'Wo_SendCanonicalLiveKitCallPush');

    expect(service).toContain(
      "md5('vnseea-livekit|' . $call_type . '|' . $call_id)",
    );
    expect(sender).toContain("'event_type' => 'livekit_call'");
    expect(sender).toContain("'call_context' => 'direct'");
    expect(sender).toContain("'provider' => 'livekit'");
    expect(sender).toContain(
      "'uuid' => Wo_CanonicalLiveKitCallUuid($call_id, $call_type)",
    );
    expect(sender).toContain("'expires_at' => (string) $expires_at");
    expect(sender).toContain("'action_token' => $action_token");
    expect(sender).toContain("'/api/livekit'");
    expect(sender).toContain('$expires_at = time() + 45;');
    expect(source).toContain('Wo_SendCanonicalLiveKitCallPush(');
  });

  it('builds group CallKit payload with fullscreen policy, per-recipient token, and mobile API URL', () => {
    const source = read('phtml/api/v2/endpoints/group_call.php');
    const sender = functionBody(source, 'Wo_ApiGroupCallSendPush');

    expect(source).toContain("md5('vnseea-livekit-group|' . $call_type . '|' . $call_id)");
    expect(sender).toContain("$ring_mode = count($recipient_ids) <= 8 ? 'fullscreen' : 'passive';");
    expect(sender).toContain("'event_type' => 'livekit_group_call'");
    expect(sender).toContain("'provider' => 'livekit_group'");
    expect(sender).toContain("'call_context' => 'group'");
    expect(sender).toContain("'uuid' => Wo_ApiGroupCallUuid($call_id, $call_type)");
    expect(sender).toContain("'group_name' => $group_data['name']");
    expect(sender).toContain("'caller_name' => $caller_data['name']");
    expect(sender).toContain("'ring_mode' => $ring_mode");
    expect(sender).toContain("'api_url' => rtrim($wo['config']['site_url'], '/') . '/api/group_call'");
    expect(sender).toContain("$notification_data['action_token'] = Wo_ApiGroupCallSignActionToken");
    expect(sender).toContain("if ($ring_mode === 'fullscreen')");
    expect(sender).toContain('Wo_ApiGroupCallSendVoipPush(');
  });

  it('supports native action answer, decline, and close for direct calls', () => {
    const source = read('phtml/api/v2/endpoints/livekit.php');
    const nativeAction = source.slice(source.indexOf("else if ($action == 'native_action')"));

    expect(nativeAction).toContain("$call_action == 'answer'");
    expect(nativeAction).toContain("Wo_ApiLiveKitAnswerCall($call_id, $call_type, $actor_id)");
    expect(nativeAction).toContain("$call_action == 'decline'");
    expect(nativeAction).toContain("Wo_ApiLiveKitCloseCall($call_id, $call_type, 'declined', 0, $actor_id)");
    expect(nativeAction).toContain("$call_action == 'close'");
    expect(nativeAction).toContain("Wo_ApiLiveKitCloseCall($call_id, $call_type, 'ended', $duration, $actor_id)");
  });

  it('supports native action answer, decline, and close for group calls', () => {
    const source = read('phtml/api/v2/endpoints/group_call.php');
    const nativeAction = source.slice(source.indexOf("else if ($action == 'native_action')"));

    expect(nativeAction).toContain("$call_action == 'answer'");
    expect(nativeAction).toContain('Wo_JoinGroupCall($call_id, $actor_id)');
    expect(nativeAction).toContain("$call_action == 'decline'");
    expect(nativeAction).toContain('Wo_DeclineGroupCallInvite($call_id, $actor_id)');
    expect(nativeAction).toContain("$call_action == 'close'");
    expect(nativeAction).toContain('Wo_LeaveGroupCall($call_id, $actor_id)');
    expect(nativeAction).not.toContain("$call_action == 'leave'");
  });

  it('publishes realtime close and sync state for CallKit-visible calls', () => {
    const direct = read('phtml/api/v2/endpoints/livekit.php');
    const group = read('phtml/api/v2/endpoints/group_call.php');

    expect(direct).toContain("Wo_ApiLiveKitPublishRealtime('answered'");
    expect(direct).toContain("Wo_ApiLiveKitPublishRealtime($final_status == 'declined' ? 'declined' : 'closed'");
    expect(group).toContain("Wo_ApiGroupCallPublishRealtime('sync'");
    expect(group).toContain("Wo_ApiGroupCallPublishRealtime(!empty($group_call['status']) && $group_call['status'] === 'ended' ? 'closed' : 'sync'");
  });
});
