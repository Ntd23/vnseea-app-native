const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('HomeFeedIntro iOS header modules', () => {
  it('keeps Liquid Glass behind the iOS-only HomeFeedIntro wrapper', () => {
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(defaultSource).not.toContain('AdaptiveGlassSurface');
    expect(defaultSource).not.toContain('@callstack/liquid-glass');
    expect(iosSource).toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('HomeGreetingCard');
    expect(iosSource).toContain('HomeComposerCard');
    expect(iosSource).toContain('HomeStoriesRail');
  });

  it('uses HomeFeedIntro from FeedScreen and keeps shared ComposerCard unchanged', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const composerSource = read(
      'src/feed/presentation/components/ComposerCard.tsx',
    );

    expect(feedScreenSource).toContain("from '../components/HomeFeedIntro'");
    expect(feedScreenSource).toContain('<HomeFeedIntro');
    expect(feedScreenSource).not.toContain('<ComposerCard');
    expect(feedScreenSource).not.toContain('AdaptiveGlassSurface');
    expect(composerSource).not.toContain('AdaptiveGlassSurface');
    expect(composerSource).not.toContain('@callstack/liquid-glass');
  });

  it('keeps story rail behavior shared between default and iOS implementations', () => {
    const source = read('src/feed/presentation/components/HomeFeedIntro.shared.ts');

    expect(source).toContain('storyCreatedEvents');
    expect(source).toContain('storyDeletedEvents');
    expect(source).toContain('useStoriesViewModel');
    expect(source).toContain('ROUTES.CREATE_STORY');
    expect(source).toContain('ROUTES.STORY_VIEWER');
    expect(source).toContain('initialUserIndex');
  });

  it('keeps the current stories, composer, greeting order on both platforms', () => {
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    const defaultRender = defaultSource.slice(
      defaultSource.indexOf('export function HomeFeedIntro'),
      defaultSource.indexOf('export default HomeFeedIntro'),
    );
    const iosRender = iosSource.slice(
      iosSource.indexOf('export function HomeFeedIntro'),
      iosSource.indexOf('export default HomeFeedIntro'),
    );

    expect(defaultRender.indexOf('<DefaultStoriesRow')).toBeLessThan(
      defaultRender.indexOf('<ComposerCard'),
    );
    expect(defaultRender.indexOf('<ComposerCard')).toBeLessThan(
      defaultRender.indexOf('<DefaultGreetingCard'),
    );
    expect(iosRender.indexOf('<HomeStoriesRail')).toBeLessThan(
      iosRender.indexOf('<ComposerCard'),
    );
    expect(iosRender.indexOf('<ComposerCard')).toBeLessThan(
      iosRender.indexOf('<HomeGreetingCard'),
    );
  });

  it('renders the iOS intro surfaces edge-to-edge while keeping inner spacing', () => {
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );
    const surfaceStyle = iosSource.slice(
      iosSource.indexOf('surface: {'),
      iosSource.indexOf('glassSurface: {'),
    );
    const greetingStyle = iosSource.slice(
      iosSource.indexOf('greetingSurface: {'),
      iosSource.indexOf('greetingTextWrap: {'),
    );
    const storiesContentStyle = iosSource.slice(
      iosSource.indexOf('storiesContent: {'),
      iosSource.indexOf('storyCard: {'),
    );
    const storyCardStyle = iosSource.slice(
      iosSource.indexOf('storyCard: {'),
      iosSource.indexOf('createStoryCard: {'),
    );

    expect(surfaceStyle).not.toContain('marginHorizontal');
    expect(surfaceStyle).not.toContain('borderRadius');
    expect(surfaceStyle).not.toContain('marginBottom');
    expect(greetingStyle).toContain('padding: 15');
    expect(storiesContentStyle).toContain('paddingHorizontal: 5');
    expect(storiesContentStyle).toContain('columnGap: 5');
    expect(storyCardStyle).toContain('borderRadius: 24');
    expect(iosSource).not.toContain('style={styles.root}');
    expect(defaultSource).toContain('paddingHorizontal: 16');
    expect(defaultSource).toContain('rounded-[18px]');
  });

  it('uses the logged-in avatar for the iOS create-story card', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain("Pick<HomeFeedIntroProps, 'avatarUrl' | 'copy'>");
    expect(iosSource).toContain('source={{ uri: avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR }}');
    expect(iosSource).not.toContain('source={{ uri: HOME_INTRO_FALLBACK_AVATAR }}');
  });

  it('keeps the iOS create-story plus button centered by anchoring it separately', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain('createStoryPlusAnchor');
    expect(iosSource).toContain('alignItems:');
    expect(iosSource).toContain("'center'");
  });

  it('adds iOS-only greeting dismissal with a one-hour TTL', () => {
    const sharedSource = read(
      'src/feed/presentation/components/HomeFeedIntro.shared.ts',
    );
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );

    expect(sharedSource).toContain('HOME_GREETING_DISMISS_MS');
    expect(sharedSource).toContain('60 * 60 * 1000');
    expect(sharedSource).toContain('homeIntro.greetingHiddenUntil');
    expect(sharedSource).toContain('useHomeGreetingDismissal');
    expect(iosSource).toContain('onDismissGreeting');
    expect(iosSource).toContain('greetingCloseButton');
    expect(defaultSource).not.toContain('useHomeGreetingDismissal');
  });

  it('renders the iOS composer prompt as a glass control', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain('composerInputGlass');
    expect(iosSource).toContain('<GlassSurface');
    expect(iosSource).toContain('style={styles.composerInputGlass}');
  });

  it('centers the iOS create-story plus icon outside native glass child layout', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain('createStoryPlusIconLayer');
    expect(iosSource).toContain('pointerEvents="none"');
    expect(iosSource).toContain('style={styles.createStoryPlusIconLayer}');
    expect(iosSource).toContain('<Plus size={21}');
  });

  it('keeps the iOS greeting title only slightly larger than the subtitle', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toMatch(/greetingTitle:\s*{[^}]*fontSize:\s*14/s);
    expect(iosSource).toMatch(/greetingTitle:\s*{[^}]*lineHeight:\s*18/s);
    expect(iosSource).toMatch(/greetingBody:\s*{[^}]*fontSize:\s*12/s);
    expect(iosSource).toMatch(/greetingBody:\s*{[^}]*lineHeight:\s*17/s);
  });

  it('uses iOS-only swipe gesture dismissal for the greeting card', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );

    expect(iosSource).toContain("from 'react-native-gesture-handler'");
    expect(iosSource).toContain('GestureDetector');
    expect(iosSource).toContain('Gesture.Pan()');
    expect(iosSource).toContain('useSharedValue');
    expect(iosSource).toContain('useAnimatedStyle');
    expect(iosSource).toContain('withTiming');
    expect(iosSource).toContain('withSpring');
    expect(iosSource).toContain('runOnJS');
    expect(iosSource).toContain('runOnJS(onDismiss)()');
    expect(iosSource).toContain('activeOffsetX([-16, 16])');
    expect(iosSource).toContain('failOffsetY([-12, 12])');
    expect(defaultSource).not.toContain('GestureDetector');
    expect(defaultSource).not.toContain('useSharedValue');
  });
});
