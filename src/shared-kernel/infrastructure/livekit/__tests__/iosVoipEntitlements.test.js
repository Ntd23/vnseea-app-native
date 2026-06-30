const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('iOS PushKit and APNs entitlement wiring', () => {
  it('declares APNs environment in the VNSEEA entitlements file', () => {
    const entitlementsPath = path.join(
      root,
      'ios/VNSEEA/VNSEEA.entitlements',
    );

    expect(fs.existsSync(entitlementsPath)).toBe(true);

    const entitlements = fs.readFileSync(entitlementsPath, 'utf8');
    expect(entitlements).toContain('<key>aps-environment</key>');
    expect(entitlements).toContain('<string>$(APS_ENVIRONMENT)</string>');
  });

  it('uses the VNSEEA entitlements file for both app build configurations', () => {
    const project = read('ios/VNSEEA.xcodeproj/project.pbxproj');
    const matches =
      project.match(
        /CODE_SIGN_ENTITLEMENTS = VNSEEA\/VNSEEA\.entitlements;/g,
      ) || [];

    expect(matches).toHaveLength(2);
  });

  it('uses development APNs for debug builds and production APNs for release builds', () => {
    const project = read('ios/VNSEEA.xcodeproj/project.pbxproj');

    expect(project).toContain('APS_ENVIRONMENT = development;');
    expect(project).toContain('APS_ENVIRONMENT = production;');
  });

  it('keeps audio, VoIP, and remote notification background modes enabled', () => {
    const plist = read('ios/VNSEEA/Info.plist');

    expect(plist).toContain('<key>UIBackgroundModes</key>');
    expect(plist).toContain('<string>audio</string>');
    expect(plist).toContain('<string>voip</string>');
    expect(plist).toContain('<string>remote-notification</string>');
  });
});
