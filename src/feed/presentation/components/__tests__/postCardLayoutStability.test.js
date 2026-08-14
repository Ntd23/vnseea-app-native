const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function readPostCards() {
  return fs.readFileSync(
    path.join(repoRoot, 'src/feed/presentation/components/PostCards.tsx'),
    'utf8',
  );
}

function readPollPostCard() {
  return fs.readFileSync(
    path.join(repoRoot, 'src/feed/presentation/components/PollPostCard.tsx'),
    'utf8',
  );
}

function readFeedViewModel() {
  return fs.readFileSync(
    path.join(repoRoot, 'src/feed/application/view-models/useFeedViewModel.ts'),
    'utf8',
  );
}

function readFeedScreen() {
  return fs.readFileSync(
    path.join(repoRoot, 'src/feed/presentation/screens/FeedScreen.tsx'),
    'utf8',
  );
}

describe('Post card rendering stability', () => {
  it('keeps a fixed reaction-summary slot so first reactions do not resize the card', () => {
    const source = readPostCards();
    const summarySource = source.slice(
      source.indexOf('const VideoReactionSummary'),
      source.indexOf('const VideoPostActions'),
    );
    const hookIndex = summarySource.indexOf(
      'const handleOpenReactions = useCallback',
    );

    expect(hookIndex).toBeGreaterThan(-1);
    expect(summarySource).not.toContain(
      'if (likeCount <= 0 && commentCount <= 0) return null;',
    );
    expect(summarySource).toContain('style={styles.reactionSummaryRow}');
    expect(source).toContain('reactionSummaryRow: {');
    expect(source).toContain('minHeight: 20,');
  });

  it('learns legacy video geometry without resizing the mounted row', () => {
    const source = readPostCards();
    const measurementSource = source.slice(
      source.indexOf('// Learn geometry for legacy posts'),
      source.indexOf('// Persist the canonical video size'),
    );

    expect(measurementSource).toContain(
      'shouldMeasureFeedVideoPosterAspectRatio(Platform.OS)',
    );
    expect(measurementSource).toContain('Image.getSize(');
    expect(measurementSource).toContain(
      'cacheMediaAspectRatio(videoPreviewCacheKey, width, height);',
    );
    expect(measurementSource).not.toContain('setAspectRatio(');
  });

  it('learns single-image geometry without resizing the mounted row', () => {
    const source = readPostCards();
    const imageCardStart = source.indexOf('const SinglePostImage = React.memo');
    const imageCardEnd = source.indexOf(
      'export const TextPostCard = React.memo',
      imageCardStart,
    );
    const imageCardSource = source.slice(imageCardStart, imageCardEnd);

    expect(imageCardStart).toBeGreaterThan(-1);
    expect(imageCardEnd).toBeGreaterThan(imageCardStart);
    expect(imageCardSource).toContain('const reservedAspectRatioRef = useRef({');
    expect(imageCardSource).toContain(
      "if (Platform.OS === 'android') return undefined;",
    );
    expect(imageCardSource).toContain('Image.getSize(');
    expect(imageCardSource).toContain(
      'cacheMediaAspectRatio(uri, width, height);',
    );
    expect(imageCardSource).not.toContain('setAspectRatio(');
  });

  it('learns image geometry during prefetch before the card enters the viewport', () => {
    const source = readFeedScreen();
    const prefetchSource = source.slice(
      source.indexOf('const scheduleImagePrefetchFlush = useCallback'),
      source.indexOf('const prefetchFeedImagesInRange = useCallback'),
    );

    expect(source).toContain('feedMediaGeometryStorage');
    expect(source).toContain(
      "from '../../infrastructure/storage/feedMediaGeometryStorage';",
    );
    expect(prefetchSource).toContain('!FEED_IS_ANDROID &&');
    expect(prefetchSource).toContain(
      '!feedMediaGeometryStorage.getAspectRatio(url)',
    );
    expect(prefetchSource).toContain('Image.getSize(');
    expect(prefetchSource).toContain(
      'feedMediaGeometryStorage.remember(url, width, height);',
    );
  });

  it('reserves video geometry from metadata, cache, then fallback on every platform', () => {
    const source = readPostCards();
    const videoCardStart = source.indexOf('export const HomeVideoPostCard');
    const videoCardEnd = source.indexOf(
      '}, areHomeVideoPostCardPropsEqual);',
      videoCardStart,
    );
    const videoCardSource = source.slice(videoCardStart, videoCardEnd);

    expect(videoCardStart).toBeGreaterThan(-1);
    expect(videoCardEnd).toBeGreaterThan(videoCardStart);
    expect(source).not.toContain(
      'const ANDROID_FEED_VIDEO_FRAME_ASPECT_RATIO = 4 / 5;',
    );
    expect(source).toContain('const FEED_VIDEO_MIN_ASPECT_RATIO = 9 / 16;');
    expect(videoCardSource).toContain(
      'const reservedAspectRatioRef = useRef({',
    );
    expect(videoCardSource).toContain('FEED_VIDEO_MIN_ASPECT_RATIO');
    expect(videoCardSource).toContain('post.mediaGeometry?.aspectRatio');
    expect(videoCardSource).toContain(
      'feedMediaGeometryStorage.getAspectRatio',
    );
    expect(videoCardSource).not.toContain('setAspectRatio(');
  });

  it('keeps reaction pickers out of Android card layout', () => {
    const source = readPostCards();
    const pollSource = readPollPostCard();
    const actionsSource = source.slice(
      source.indexOf('const VideoPostActions'),
      source.indexOf('// Ă¢â€â‚¬Ă¢â€â‚¬ ReactionPickerOverlay'),
    );
    const pickerSource = source.slice(
      source.indexOf('export function ReactionPickerOverlay'),
      source.indexOf('function ReactionIcon'),
    );

    expect(actionsSource).not.toContain('useFeedReactionPickerActivePostId()');
    expect(actionsSource).not.toContain('<FeedInlineReactionPickerBar');
    expect(pickerSource).not.toContain('if (isAndroidPicker) return null;');
    expect(pollSource).not.toContain('useFeedReactionPickerActivePostId');
    expect(pollSource).not.toContain('<FeedInlineReactionPickerBar');
  });

  it('renders the Android reaction picker as a compact accessible pill', () => {
    const source = readPostCards();
    const iconSource = source.slice(
      source.indexOf('function ReactionIcon'),
      source.indexOf('// â”€â”€ HomeVideoPostCard'),
    );

    expect(source).toContain('const ANDROID_PICKER_HEIGHT = 60;');
    expect(source).toContain(
      'const ANDROID_PICKER_ICON_ROW_HEIGHT = ANDROID_PICKER_HEIGHT;',
    );
    expect(source).toContain('const ANDROID_PICKER_ICON_SIZE = 46;');
    expect(source).toContain('borderRadius: ANDROID_PICKER_HEIGHT / 2,');
    expect(iconSource).toContain('accessibilityRole="button"');
    expect(iconSource).toContain('accessibilityLabel={label}');
  });

  it('does not consume the Feed optimistic reaction event twice', () => {
    const source = readFeedViewModel();

    expect(source).toContain("source?: 'feed' | 'reels';");
    expect(source).toContain("if (event.source === 'feed') return;");
    expect(source).toContain("source: 'feed',");
  });

  it('keeps the native Feed video surface stable during reaction-only renders', () => {
    const source = readPostCards();
    const videoCardSource = source.slice(
      source.indexOf('export const HomeVideoPostCard'),
      source.indexOf('// Ă¢â€â‚¬Ă¢â€â‚¬ PostHeader'),
    );

    expect(videoCardSource).toContain('const stableVideoSurface = useMemo(');
    expect(videoCardSource).toContain('{stableVideoSurface}');

    const surfaceSource = videoCardSource.slice(
      videoCardSource.indexOf('const stableVideoSurface = useMemo('),
      videoCardSource.indexOf('// Need an on-screen position'),
    );
    expect(surfaceSource).not.toContain('post.myReaction');
    expect(surfaceSource).not.toContain('post.likeCount');
    expect(surfaceSource).not.toContain('post.topReactions');
  });

  it('ignores queued native callbacks from an obsolete player generation', () => {
    const source = readPostCards();
    const videoCardSource = source.slice(
      source.indexOf('export const HomeVideoPostCard'),
      source.indexOf('// Ä‚Â¢Ă¢â‚¬ÂĂ¢â€Â¬Ä‚Â¢Ă¢â‚¬ÂĂ¢â€Â¬ PostHeader'),
    );

    expect(videoCardSource).toContain('videoPlayerGenerationRef.current');
    expect(videoCardSource).toContain(
      'if (callbackGeneration !== videoPlayerGenerationRef.current) return;',
    );
    expect(videoCardSource).toContain(
      'onReadyForDisplay={() =>\n            handleVideoReadyForDisplay(videoPlayerGeneration)',
    );
    expect(videoCardSource).toContain(
      'onProgress={data => handleVideoProgress(videoPlayerGeneration, data)}',
    );
    expect(videoCardSource).toContain(
      'onError={error => handleVideoError(videoPlayerGeneration, error)}',
    );
  });

  it('uses a stable post-aware media surface registrar', () => {
    const cardSource = readPostCards();
    const screenSource = readFeedScreen();

    expect(cardSource).toContain('mediaSurfaceRef?.(post.id, node);');
    expect(cardSource).toContain('ref={handleMediaSurfaceRef}');
    expect(screenSource).toContain('mediaSurfaceRef={setFeedVideoRef}');
    expect(screenSource).not.toContain(
      'mediaSurfaceRef={node => setFeedVideoRef(item.id, node)}',
    );
  });
});
