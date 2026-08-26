const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('mobile app update backend contract', () => {
  it('publishes platform versions and store links in public settings', () => {
    const endpoint = read('phtml/api/v2/endpoints/get-site-settings.php');

    expect(endpoint).toContain("'mobile_app' => array(");
    expect(endpoint).toContain("'vnseea_ios_app_version'");
    expect(endpoint).toContain("'vnseea_android_app_version'");
    expect(endpoint).toContain("'vnseea_ios_store_url'");
    expect(endpoint).toContain("'vnseea_android_store_url'");
  });

  it('bootstraps editable config and exposes all fields in Admin', () => {
    const appStart = read('phtml/assets/includes/app_start.php');
    const admin = read('phtml/admin-panel/pages/site-settings/content.phtml');

    [
      'vnseea_ios_app_version',
      'vnseea_android_app_version',
      'vnseea_ios_store_url',
      'vnseea_android_store_url',
    ].forEach(key => {
      expect(appStart).toContain(`'${key}'`);
      expect(admin).toContain(`name="${key}"`);
    });
  });
});
