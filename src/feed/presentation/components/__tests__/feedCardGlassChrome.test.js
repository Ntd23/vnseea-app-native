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

  it('keeps Android media unchanged while iOS cards and media render edge-to-edge', () => {
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
    const iosCardOuterStyle = iosSource.slice(
      iosSource.indexOf('cardOuter: {'),
      iosSource.indexOf('cardInner: {'),
    );
    const iosCardInnerStyle = iosSource.slice(
      iosSource.indexOf('cardInner: {'),
      iosSource.indexOf('cardContent: {'),
    );
    const iosCardContentStyle = iosSource.slice(
      iosSource.indexOf('cardContent: {'),
      iosSource.indexOf('mediaFrame: {'),
    );
    const iosMediaFrameStyle = iosSource.slice(
      iosSource.indexOf('mediaFrame: {'),
      iosSource.indexOf('actionBar: {'),
    );

    expect(defaultSource).toContain('mergeClassName(FEED_MEDIA_CLASS, className)');
    expect(defaultSource).toContain("FEED_CARD_PADDING_CLASS = 'px-3 py-3'");
    expect(iosMediaFrame).not.toContain('mergeClassName(FEED_MEDIA_CLASS');
    expect(iosMediaFrame).toContain('className={className}');
    expect(iosSource).toContain('alignSelf:');
    expect(iosCardOuterStyle).not.toContain('marginHorizontal');
    expect(iosCardOuterStyle).not.toContain('borderRadius');
    expect(iosCardInnerStyle).not.toContain('borderRadius');
    expect(iosMediaFrameStyle).not.toContain('marginHorizontal');
    expect(iosMediaFrameStyle).not.toContain('borderRadius');
    expect(iosCardContentStyle).toContain('paddingHorizontal: 15');
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
    const defaultGridWidthSource = source.slice(
      source.indexOf('const DEFAULT_PHOTO_GRID_WIDTH'),
      source.indexOf('const PHOTO_GRID_GUTTER_SIZE'),
    );

    expect(source).toContain("from './photoGridLayout'");
    expect(source).toContain('onLayout={handlePhotoGridLayout}');
    expect(source).toContain("Platform.OS === 'ios'");
    expect(defaultGridWidthSource).toContain("Platform.OS === 'ios'");
    expect(defaultGridWidthSource).toContain("? Dimensions.get('window').width");
    expect(defaultGridWidthSource).toContain(": Dimensions.get('window').width - 8");
    expect(source).not.toContain('FEED_PHOTO_GRID_WIDTH');
    expect(source).not.toContain('PHOTO_GRID_LAYOUTS');
  });

  it('keeps iOS photo tiles square and applies edge-aware internal gutters', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');

    expect(source).toContain('getPhotoGridItemGutterStyle');
    expect(source).toContain('PHOTO_GRID_GUTTER_SIZE');
    expect(source).not.toContain('IOS_PHOTO_GRID_TILE_STYLE');
    expect(source).not.toContain('PHOTO_GRID_ITEM_PADDING');
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
