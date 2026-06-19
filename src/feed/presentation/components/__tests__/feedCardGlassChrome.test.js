const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('iOS feed card glass chrome', () => {
  it('keeps Liquid Glass behind the platform-specific wrapper', () => {
    const defaultSource = read(
      'src/feed/presentation/components/FeedCardChrome.tsx',
    );
    const iosSource = read(
      'src/feed/presentation/components/FeedCardChrome.ios.tsx',
    );

    expect(defaultSource).not.toContain('@callstack/liquid-glass');
    expect(defaultSource).not.toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('FeedGlassActionBar');
    expect(iosSource).toContain('FeedGlassActionButton');
    expect(iosSource).toContain('FeedReactionPickerSurface');
  });

  it('keeps Android media full-width while iOS media uses inset layout without Android width class', () => {
    const defaultSource = read(
      'src/feed/presentation/components/FeedCardChrome.tsx',
    );
    const iosSource = read(
      'src/feed/presentation/components/FeedCardChrome.ios.tsx',
    );
    const iosMediaFrame = iosSource.slice(
      iosSource.indexOf('export function FeedMediaFrame'),
      iosSource.indexOf('export function FeedGlassActionBar'),
    );

    expect(defaultSource).toContain('mergeClassName(FEED_MEDIA_CLASS, className)');
    expect(iosMediaFrame).not.toContain('mergeClassName(FEED_MEDIA_CLASS');
    expect(iosMediaFrame).toContain('className={className}');
    expect(iosSource).toContain('alignSelf:');
  });

  it('uses a platform chrome wrapper for the reaction picker and keeps hooks before null returns', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');
    const overlay = source.slice(
      source.indexOf('export function ReactionPickerOverlay'),
      source.indexOf('function ReactionIcon'),
    );

    expect(source).toContain('FeedReactionPickerSurface');
    expect(source).toContain('FeedReactionPickerPointer');
    expect(source).not.toContain('AdaptiveGlassSurface');
    expect(overlay.indexOf('const localDragged = useSharedValue(false)')).toBeGreaterThanOrEqual(0);
    expect(overlay.indexOf('if (!anchor) return null')).toBeGreaterThan(
      overlay.indexOf('const localDragged = useSharedValue(false)'),
    );
  });

  it('measures the iOS photo grid from its rendered container and keeps Android fallback width', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');

    expect(source).toContain("from './photoGridLayout'");
    expect(source).toContain('onLayout={handlePhotoGridLayout}');
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain("Dimensions.get('window').width - 8");
    expect(source).not.toContain('FEED_PHOTO_GRID_WIDTH');
    expect(source).not.toContain('PHOTO_GRID_LAYOUTS');
  });

  it('applies the shared chrome to text/video post cards without changing action handlers', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');

    expect(source).toContain("from './FeedCardChrome'");
    expect(source).toContain('<FeedCardSurface');
    expect(source).toContain('<FeedCardContent');
    expect(source).toContain('<FeedMediaFrame');
    expect(source).toContain('<FeedGlassActionBar');
    expect(source).toContain('<FeedGlassActionButton');
    expect(source).toContain('onLikeTap');
    expect(source).toContain('onLikeLongPress');
    expect(source).toContain('onCommentTap');
    expect(source).toContain('onShare');
  });

  it('does not import AdaptiveGlassSurface directly from feed screens', () => {
    const source = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(source).not.toContain('AdaptiveGlassSurface');
    expect(source).toContain("from '../components/FeedCardChrome'");
  });
});
