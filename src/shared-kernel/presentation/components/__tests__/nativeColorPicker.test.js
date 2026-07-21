const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('native iOS label color picker', () => {
  it('uses UIColorPickerViewController without alpha and returns opaque hex', () => {
    const swiftSource = read('ios/VNSEEA/VnseeaColorPicker.swift');
    const bridgeSource = read('ios/VNSEEA/VnseeaColorPicker.m');

    expect(swiftSource).toContain('UIColorPickerViewController');
    expect(swiftSource).toContain('picker.supportsAlpha = false');
    expect(swiftSource).toContain('RCTPresentedViewController()');
    expect(swiftSource).toContain('E_COLOR_PICKER_BUSY');
    expect(swiftSource).toContain('String(format: "#%02X%02X%02X"');
    expect(bridgeSource).toContain(
      'RCT_EXTERN_MODULE(VnseeaColorPicker, NSObject)',
    );
    expect(bridgeSource).toContain('RCT_EXTERN_METHOD(pickColor:');
  });

  it('uses the native module on iOS while preserving the Android picker', () => {
    const iosSource = read(
      'src/shared-kernel/presentation/components/ColorPicker.ios.tsx',
    );
    const androidSource = read(
      'src/shared-kernel/presentation/components/ColorPicker.tsx',
    );

    expect(iosSource).toContain('NativeModules.VnseeaColorPicker');
    expect(iosSource).toContain('Alert.alert');
    expect(iosSource).not.toContain(
      'disabled={isPicking || !nativeColorPicker}',
    );
    expect(iosSource).toMatch(
      /pickColor\(\s*value,\s*label \?\? '',\s*\)/,
    );
    expect(iosSource).toContain('onChange(selectedColor)');
    expect(iosSource).not.toContain('ColorCustomizeModal');
    expect(androidSource).toContain('ColorCustomizeModal');
    expect(androidSource).toContain('PRESET_COLORS');
  });

  it('keeps both message label creation flows wired to the selected color', () => {
    const messageSource = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );
    const pickerUsages = messageSource.match(/<ColorPicker/g) ?? [];

    expect(pickerUsages).toHaveLength(3);
    expect(messageSource.match(/value=\{labelColor\}/g) ?? []).toHaveLength(3);
    expect(messageSource.match(/onChange=\{setLabelColor\}/g) ?? []).toHaveLength(
      3,
    );
    expect(messageSource).toMatch(
      /Platform\.OS === 'ios'[\s\S]*?<ColorPicker[\s\S]*?value=\{labelColor\}/,
    );
    expect(messageSource).toContain(
      "Platform.OS !== 'ios' && showColorPicker",
    );
    expect(messageSource).toContain('onCreate(name, color)');
    expect(messageSource).toContain('labelName.trim(),');
    expect(messageSource).toContain('labelColor,');
    expect(messageSource).toContain('Array.from(selectedUserIds)');
  });

  it('adds both native source files to the VNSEEA target', () => {
    const projectSource = read('ios/VNSEEA.xcodeproj/project.pbxproj');

    expect(projectSource).toContain('VnseeaColorPicker.swift in Sources');
    expect(projectSource).toContain('VnseeaColorPicker.m in Sources');
  });
});
