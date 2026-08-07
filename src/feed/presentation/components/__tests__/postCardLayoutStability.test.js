const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function readPostCards() {
  return fs.readFileSync(
    path.join(
      repoRoot,
      'src/feed/presentation/components/PostCards.tsx',
    ),
    'utf8',
  );
}

function readPollPostCard() {
  return fs.readFileSync(
    path.join(
      repoRoot,
      'src/feed/presentation/components/PollPostCard.tsx',
    ),
    'utf8',
  );
}

function readFeedViewModel() {
  return fs.readFileSync(
    path.join(
      repoRoot,
      'src/feed/application/view-models/useFeedViewModel.ts',
    ),
    'utf8',
  );
}

describe('Post card rendering stability', () => {
  it('calls reaction-summary hooks before its empty-row return', () => {
    const source = readPostCards();
    const summarySource = source.slice(
      source.indexOf('const VideoReactionSummary'),
      source.indexOf('const VideoPostActions'),
    );
    const hookIndex = summarySource.indexOf(
      'const handleOpenReactions = useCallback',
    );
    const earlyReturnIndex = summarySource.indexOf(
      'if (likeCount <= 0 && commentCount <= 0) return null;',
    );

    expect(hookIndex).toBeGreaterThan(-1);
    expect(earlyReturnIndex).toBeGreaterThan(hookIndex);
  });

  it('measures video thumbnails before scroll idle and caches their stable identity', () => {
    const source = readPostCards();
    const measurementSource = source.slice(
      source.indexOf('// Measure thumbnail size on mount'),
      source.indexOf('// Refine aspect ratio when actual video loads'),
    );

    expect(measurementSource).toContain('Image.getSize(');
    expect(measurementSource).not.toContain('isScrollBusy');
    expect(measurementSource).toContain(
      'cacheMediaAspectRatio(videoPreviewCacheKey, width, height);',
    );
  });

  it('keeps Android feed video rows at a stable 4:5 frame', () => {
    const source = readPostCards();
    const videoCardStart = source.indexOf('export const HomeVideoPostCard');
    const videoCardEnd = source.indexOf(
      '}, areHomeVideoPostCardPropsEqual);',
      videoCardStart,
    );
    const videoCardSource = source.slice(
      videoCardStart,
      videoCardEnd,
    );

    expect(videoCardStart).toBeGreaterThan(-1);
    expect(videoCardEnd).toBeGreaterThan(videoCardStart);
    expect(source).toContain(
      'const ANDROID_FEED_VIDEO_FRAME_ASPECT_RATIO = 4 / 5;',
    );
    expect(videoCardSource).toContain(
      "Platform.OS === 'android'\n      ? ANDROID_FEED_VIDEO_FRAME_ASPECT_RATIO",
    );
    expect(videoCardSource).toContain(
      "if (Platform.OS === 'android') return;",
    );
    expect(videoCardSource.match(/setAspectRatio\(/g)).toHaveLength(1);
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
});
