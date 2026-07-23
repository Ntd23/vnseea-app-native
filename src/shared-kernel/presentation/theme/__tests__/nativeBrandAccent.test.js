const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('native VNSEEA accent', () => {
  it('sets the iOS window and native tab active tint to brand red', () => {
    const appDelegate = read('ios/VNSEEA/AppDelegate.swift');
    const tabBar = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');

    expect(appDelegate).toContain('VNSEEAColor.brandPrimary');
    expect(appDelegate).toContain('window?.tintColor = VNSEEAColor.brandPrimary');
    expect(tabBar).toContain('tabBar.tintColor = VNSEEAColor.brandPrimary');
  });

  it('uses brand red as the native label picker fallback', () => {
    const colorPicker = read('ios/VNSEEA/VnseeaColorPicker.swift');

    expect(colorPicker).toContain('private var initialHex = "#B91C1C"');
    expect(colorPicker).toContain('private var selectedHex = "#B91C1C"');
    expect(colorPicker).toContain('?? "#B91C1C"');
  });

  it('keeps iOS Liquid Glass background behavior intact', () => {
    const tabBar = read('ios/VNSEEA/VNSEEAIosLiquidTabBar.swift');

    expect(tabBar).toContain('if #available(iOS 26.0, *)');
    expect(tabBar).toContain('appearance.configureWithTransparentBackground()');
    expect(tabBar).toContain('appearance.configureWithDefaultBackground()');
  });

  it('uses brand red for Android system controls', () => {
    const styles = read('android/app/src/main/res/values/styles.xml');
    const colors = read('android/app/src/main/res/values/colors.xml');

    expect(colors).toContain('<color name="brand_primary">#B91C1C</color>');
    expect(styles).toContain('<item name="colorAccent">@color/brand_primary</item>');
    expect(styles).toContain(
      '<item name="colorControlActivated">@color/brand_primary</item>',
    );
  });
});
