const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../CreatePageScreen.tsx'),
  'utf8',
);

describe('CreatePageScreen bottom safe-area ownership', () => {
  it('keeps the footer actions above Android three-button navigation', () => {
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('110 + insets.bottom');
    expect(source).toContain('paddingBottom: formBottomPadding');
    expect(source).toContain('height: 72 + insets.bottom');
    expect(source).toContain('paddingBottom: insets.bottom');
  });

  it('uses the same platform-aware Home header treatment', () => {
    expect(source).toContain("Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'");
    expect(source).toContain(
      "barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}",
    );
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />',
    );
  });

  it('keeps every editable text field visible above the keyboard', () => {
    const inputCount = (source.match(/<TextInput/g) || []).length;
    const focusHookCount = (
      source.match(/onFocus=\{event => handleInputFocus\(event\.target\)\}/g) || []
    ).length;

    expect(source).toContain('ref={formScrollRef}');
    expect(source).toContain('scrollResponderScrollNativeHandleToKeyboard');
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(source).toContain("automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain('Keyboard.addListener(showEvent');
    expect(source).toContain('Keyboard.addListener(hideEvent');
    expect(source).toContain('{!isKeyboardVisible ? (');
    expect(focusHookCount).toBe(inputCount);
  });
});
