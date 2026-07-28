const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('CreateAdScreen mobile-first UX', () => {
  it('uses the Home header treatment on both platforms', () => {
    const source = read(
      'src/advertising/presentation/screens/CreateAdScreen.tsx',
    );

    expect(source).toContain("Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'");
    expect(source).toContain(
      "barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}",
    );
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />',
    );
  });

  it('keeps focused fields above the keyboard in the live form renderer', () => {
    const source = read(
      'src/advertising/presentation/screens/CreateAdScreen.tsx',
    );
    const activeRenderer = source.slice(
      source.indexOf('const renderPhtmlStepContent = () => {'),
      source.indexOf('const headerBackgroundColor ='),
    );
    const focusHooks = activeRenderer.match(
      /onFocus=\{event => handleInputFocus\(event\.target\)\}/g,
    );

    expect(source).toContain('<KeyboardAvoidingView');
    expect(source).toContain('ref={formScrollRef}');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain('automaticallyAdjustKeyboardInsets={Platform.OS === \'ios\'}');
    expect(source).toContain('scrollResponderScrollNativeHandleToKeyboard');
    expect(source).toContain('Keyboard.addListener(showEvent');
    expect(source).toContain('Keyboard.addListener(hideEvent');
    expect(source).toContain('{!isKeyboardVisible ? (');
    expect(focusHooks).toHaveLength(6);
  });

  it('shows selected media in both the picker and persistent ad preview', () => {
    const source = read(
      'src/advertising/presentation/screens/CreateAdScreen.tsx',
    );

    expect(source).toContain("mediaType: 'mixed'");
    expect(source).toContain('imagePreview && !mediaPreviewIsVideo');
    expect(source).toContain('source={{ uri: imagePreview }}');
    expect(source).toContain('mediaPlacementMismatch');
    expect(source).toContain('The selected media does not match the display placement.');
  });

  it('renders a non-editable protocol prefix and only asks for the domain', () => {
    const source = read(
      'src/advertising/presentation/screens/CreateAdScreen.tsx',
    );

    expect(source).toContain('website: editingAd?.url || AD_WEBSITE_PREFIX');
    expect(source).toContain('{getAdWebsiteProtocol(formData.website)}');
    expect(source).toContain('value={getAdWebsiteHost(formData.website)}');
    expect(source).toContain('website: buildAdWebsiteUrl(website)');
    expect(source).toContain('website: AD_WEBSITE_PREFIX');
  });
});
