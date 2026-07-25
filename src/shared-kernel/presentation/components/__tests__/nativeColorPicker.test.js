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

  it('keeps message label management wired to the selected color', () => {
    const messageLabelsSource = read(
      'src/messages/presentation/screens/MessageLabelsScreen.tsx',
    );
    const pickerUsages = messageLabelsSource.match(/<ColorPicker/g) ?? [];

    expect(pickerUsages).toHaveLength(1);
    expect(messageLabelsSource).toContain('value={labelColor}');
    expect(messageLabelsSource).toContain('onChange={setLabelColor}');
    expect(messageLabelsSource).toContain('repository.createLabel(');
    expect(messageLabelsSource).toContain('normalizedName,');
    expect(messageLabelsSource).toContain('labelColor.toUpperCase()');
  });

  it('adds both native source files to the VNSEEA target', () => {
    const projectSource = read('ios/VNSEEA.xcodeproj/project.pbxproj');

    expect(projectSource).toContain('VnseeaColorPicker.swift in Sources');
    expect(projectSource).toContain('VnseeaColorPicker.m in Sources');
  });
});
