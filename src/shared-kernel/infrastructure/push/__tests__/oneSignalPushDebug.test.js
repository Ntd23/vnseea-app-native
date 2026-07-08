const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('OneSignal iOS push debug instrumentation', () => {
  it('logs client OneSignal initialization, permission, subscription, and backend sync boundaries', () => {
    const source = read('src/shared-kernel/infrastructure/push/oneSignalPush.ts');

    expect(source).toContain("const PUSH_DEBUG_PREFIX = '[VNSEEA_PUSH_DEBUG]';");
    expect(source).toContain('function logPushDebug');
    expect(source).toContain("logPushDebug('push_initialize_start'");
    expect(source).toContain("logPushDebug('push_permission_request_result'");
    expect(source).toContain("logPushDebug('push_subscription_state'");
    expect(source).toContain("logPushDebug('push_subscription_changed'");
    expect(source).toContain("logPushDebug('push_sync_request'");
    expect(source).toContain("logPushDebug('push_sync_success'");
    expect(source).toContain("logPushDebug('push_sync_error'");
    expect(source).toContain('getTokenAsync');
    expect(source).toContain('getOptedInAsync');
    expect(source).toContain('getPermissionAsync');
    expect(source).toContain('maskPushIdentifier');
    expect(source).not.toContain('subscriptionId,');
  });

  it('logs backend OneSignal attempts and responses for mobile push without exposing REST keys', () => {
    const source = read('phtml/assets/includes/onesignal_config.php');

    expect(source).toContain('function Wo_VnseeaPushDebugLog');
    expect(source).toContain('[vnseea_push_debug]');
    expect(source).toContain('vnseea_push_debug.log');
    expect(source).toContain('FILE_APPEND | LOCK_EX');
    expect(source).toContain("Wo_VnseeaPushDebugLog('onesignal_send_skipped'");
    expect(source).toContain("Wo_VnseeaPushDebugLog('onesignal_send_attempt'");
    expect(source).toContain("Wo_VnseeaPushDebugLog('onesignal_send_response'");
    expect(source).toContain("'app_id_present' => !empty($app_id) ? 1 : 0");
    expect(source).toContain("'app_key_present' => !empty($app_key) ? 1 : 0");
    expect(source).toContain('curl_getinfo($ch, CURLINFO_HTTP_CODE)');
    expect(source).toContain('Wo_VnseeaPushMaskList');
    expect(source).not.toContain("'app_key' => $app_key");
    expect(source).not.toContain("'include_player_ids' => $data['send_to']");
  });

  it('documents the iOS OneSignal and backend configuration checklist for manual verification', () => {
    const source = read('duong/onesignal-ios-push-debug.md');

    expect(source).toContain('ONESIGNAL_APP_ID');
    expect(source).toContain('ios_m_push_id');
    expect(source).toContain('ios_n_push_id');
    expect(source).toContain('ios_m_device_id');
    expect(source).toContain('ios_n_device_id');
    expect(source).toContain('com.vnseea.vnseea');
    expect(source).toContain('vnseea_push_debug.log');
    expect(source).toContain('idevicesyslog');
    expect(source).toContain('Settings > Push & In-App > Apple iOS');
  });
});
