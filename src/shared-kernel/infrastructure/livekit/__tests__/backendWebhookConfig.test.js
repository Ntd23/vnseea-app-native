const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('backend LiveKit webhook config wiring', () => {
  it('adds separate webhook signing config defaults for legacy PHP backend', () => {
    const source = read('phtml/assets/includes/app_start.php');

    expect(source).toContain("'livekit_webhook_api_key' => ''");
    expect(source).toContain("'livekit_webhook_api_secret' => ''");
  });

  it('renders webhook signing fields in LiveKit Call Settings', () => {
    const source = read('phtml/admin-panel/pages/video-settings/content.phtml');

    expect(source).toContain('name="livekit_webhook_api_key"');
    expect(source).toContain('$wo[\'config\'][\'livekit_webhook_api_key\']');
    expect(source).toContain('name="livekit_webhook_api_secret"');
    expect(source).toContain('$wo[\'config\'][\'livekit_webhook_api_secret\']');
  });

  it('verifies webhooks with webhook-specific key before falling back to token signing key', () => {
    const source = read('phtml/xhr/livekit_webhook.php');

    expect(source).toContain("livekit_webhook_api_key");
    expect(source).toContain("livekit_webhook_api_secret");
    expect(source).toContain("Wo_LiveKitWebhookConfigValue('livekit_webhook_api_key', 'livekit_api_key')");
    expect(source).toContain("Wo_LiveKitWebhookConfigValue('livekit_webhook_api_secret', 'livekit_api_secret')");

    const webhookKeyIndex = source.indexOf('livekit_webhook_api_key');
    const tokenKeyIndex = source.indexOf('livekit_api_key');
    expect(webhookKeyIndex).toBeGreaterThanOrEqual(0);
    expect(tokenKeyIndex).toBeGreaterThanOrEqual(0);
    expect(webhookKeyIndex).toBeLessThan(tokenKeyIndex);
  });
});
