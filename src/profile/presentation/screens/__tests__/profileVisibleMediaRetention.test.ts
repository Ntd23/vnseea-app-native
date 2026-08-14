import { createProfileVisibleMediaRetentionController } from '../profileVisibleMediaRetention';

describe('Profile visible media retention', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createHarness() {
    const commits: string[][] = [];
    const clearedActiveVideoIds: string[] = [];
    let retentionAllowed = true;
    let activeVideoId: string | null = 'video-1';
    const controller = createProfileVisibleMediaRetentionController({
      retentionDurationMs: 140,
      getAvailablePostIds: () => new Set(['video-1', 'post-2']),
      canRetain: () => retentionAllowed,
      getActiveVideoId: () => activeVideoId,
      onCommit: visiblePostIds => {
        commits.push(Array.from(visiblePostIds));
      },
      onClearActiveVideo: videoId => {
        clearedActiveVideoIds.push(videoId);
        activeVideoId = null;
      },
    });

    return {
      commits,
      clearedActiveVideoIds,
      controller,
      setRetentionAllowed(value: boolean) {
        retentionAllowed = value;
      },
    };
  }

  it('keeps the player visible when a reaction update emits a transient empty snapshot', () => {
    const { commits, clearedActiveVideoIds, controller } = createHarness();

    controller.publish(['video-1']);
    controller.publish([]);
    jest.advanceTimersByTime(139);

    expect(commits.at(-1)).toEqual(['video-1']);
    expect(clearedActiveVideoIds).toEqual([]);

    controller.publish(['video-1']);
    jest.advanceTimersByTime(2);

    expect(commits.at(-1)).toEqual(['video-1']);
    expect(clearedActiveVideoIds).toEqual([]);
  });

  it('releases the player once a genuinely empty snapshot reaches the fixed deadline', () => {
    const { commits, clearedActiveVideoIds, controller } = createHarness();

    controller.publish(['video-1']);
    controller.publish([]);
    jest.advanceTimersByTime(140);

    expect(commits.at(-1)).toEqual([]);
    expect(clearedActiveVideoIds).toEqual(['video-1']);
  });

  it('cancels pending retention without publishing during unmount', () => {
    const { commits, clearedActiveVideoIds, controller } = createHarness();

    controller.publish(['video-1']);
    controller.publish([]);
    const commitCountBeforeUnmount = commits.length;

    controller.dispose();
    jest.advanceTimersByTime(140);

    expect(commits).toHaveLength(commitCountBeforeUnmount);
    expect(clearedActiveVideoIds).toEqual([]);
  });

  it('does not republish stale Profile ids if focus is lost before expiry', () => {
    const {
      commits,
      clearedActiveVideoIds,
      controller,
      setRetentionAllowed,
    } = createHarness();

    controller.publish(['video-1']);
    controller.publish([]);
    const commitCountBeforeBlur = commits.length;
    setRetentionAllowed(false);
    jest.advanceTimersByTime(140);

    expect(commits).toHaveLength(commitCountBeforeBlur);
    expect(clearedActiveVideoIds).toEqual([]);
  });

  it('keeps cached viewport ids for background resume but resets them on route change', () => {
    const { commits, controller } = createHarness();

    controller.publish(['video-1']);
    controller.clear({ publish: true, resetLatest: false });

    expect(commits.at(-1)).toEqual([]);
    expect(controller.getLatestPostIds()).toEqual(['video-1']);

    controller.clear({ publish: true, resetLatest: true });

    expect(controller.getLatestPostIds()).toEqual([]);
  });
});
