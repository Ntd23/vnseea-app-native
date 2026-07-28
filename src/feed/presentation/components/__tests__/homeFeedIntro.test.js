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
    expect(iosSource).toContain('<ComposerCard');
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

  it('keeps stories before composer and never renders a greeting card', () => {
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
    expect(iosRender.indexOf('<HomeStoriesRail')).toBeLessThan(
      iosRender.indexOf('<ComposerCard'),
    );
    expect(defaultRender).not.toContain('Greeting');
    expect(iosRender).not.toContain('Greeting');
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
    expect(storiesContentStyle).toContain('paddingHorizontal: 5');
    expect(storiesContentStyle).toContain('columnGap: 5');
    expect(storyCardStyle).toContain('borderRadius: 24');
    expect(iosSource).not.toContain('style={styles.root}');
    expect(defaultSource).toContain('paddingHorizontal: 16');
    expect(defaultSource).toContain('rounded-[20px]');
  });

  it('uses the logged-in avatar for the iOS create-story card', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain('}: Pick<');
    expect(iosSource).toContain("'avatarUrl' | 'copy'");
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

  it('removes greeting models, dismissal storage and renderers on all platforms', () => {
    const sharedSource = read(
      'src/feed/presentation/components/HomeFeedIntro.shared.ts',
    );
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );
    const defaultSource = read(
      'src/feed/presentation/components/HomeFeedIntro.tsx',
    );
    const feedCopySource = read(
      'src/feed/presentation/components/PostCards.tsx',
    );

    expect(sharedSource).not.toContain('HOME_GREETING');
    expect(sharedSource).not.toContain('getHomeGreetingModel');
    expect(sharedSource).not.toContain('useHomeGreetingDismissal');
    expect(iosSource).not.toContain('HomeGreetingCard');
    expect(defaultSource).not.toContain('DefaultGreetingCard');
    expect(feedCopySource).not.toContain('greetingTitle');
    expect(feedCopySource).not.toContain('greetingBody');
  });

  it('keeps the shared composer and all of its actions on iOS', () => {
    const iosSource = read(
      'src/feed/presentation/components/HomeFeedIntro.ios.tsx',
    );

    expect(iosSource).toContain('<ComposerCard');
    expect(iosSource).toContain('onPress={onCreatePostPress}');
    expect(iosSource).toContain('onPressAction={onCreatePostPressAction}');
    expect(iosSource).toContain('onPressAvatar={onPressAvatar}');
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

});
