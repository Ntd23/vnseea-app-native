import {
  resolveFeedVisibleMediaPostIds,
  resolveFeedVisibleMediaRetentionDeadline,
  shouldClearFeedActiveVideo,
} from '../../../feed/presentation/screens/feedVideoAutoplay';

type ProfileVisibleMediaRetentionOptions = {
  retentionDurationMs: number;
  getAvailablePostIds: () => Pick<ReadonlySet<string>, 'has'>;
  canRetain: () => boolean;
  getActiveVideoId: () => string | null;
  onCommit: (visiblePostIds: ReadonlySet<string>) => void;
  onClearActiveVideo: (videoId: string) => void;
};

type ClearProfileVisibleMediaOptions = {
  publish?: boolean;
  resetLatest?: boolean;
};

export function createProfileVisibleMediaRetentionController({
  retentionDurationMs,
  getAvailablePostIds,
  canRetain,
  getActiveVideoId,
  onCommit,
  onClearActiveVideo,
}: ProfileVisibleMediaRetentionOptions) {
  let committedPostIds = new Set<string>();
  let latestPostIds: string[] = [];
  let retentionTimer: ReturnType<typeof setTimeout> | null = null;
  let retentionDeadlineAtMs: number | null = null;

  const cancelRetentionTimer = () => {
    if (retentionTimer) {
      clearTimeout(retentionTimer);
      retentionTimer = null;
    }
    retentionDeadlineAtMs = null;
  };

  const commit = (postIds: Iterable<string>) => {
    const visiblePostIds = new Set(postIds);
    committedPostIds = visiblePostIds;
    onCommit(visiblePostIds);
    return visiblePostIds;
  };

  const publish = (nextPostIds: Iterable<string>) => {
    const nextIds = new Set(nextPostIds);
    latestPostIds = Array.from(nextIds);
    const nowMs = Date.now();
    const allowTransientRetention =
      canRetain() &&
      (retentionDeadlineAtMs === null || retentionDeadlineAtMs > nowMs);
    const stableIds = resolveFeedVisibleMediaPostIds({
      previousVisiblePostIds: committedPostIds,
      nextVisiblePostIds: nextIds,
      availablePostIds: getAvailablePostIds(),
      allowTransientEmptyRetention: allowTransientRetention,
    });
    const hasRetainedPostIds = stableIds.length > nextIds.size;
    const nextRetentionDeadlineAtMs =
      resolveFeedVisibleMediaRetentionDeadline({
        currentDeadlineAtMs: retentionDeadlineAtMs,
        nowMs,
        retentionDurationMs,
        allowTransientRetention,
        hasRetainedPostIds,
      });
    retentionDeadlineAtMs = nextRetentionDeadlineAtMs;
    const visiblePostIds = commit(stableIds);

    if (nextRetentionDeadlineAtMs === null) {
      cancelRetentionTimer();
      return visiblePostIds;
    }

    if (!retentionTimer) {
      retentionTimer = setTimeout(() => {
        retentionTimer = null;
        retentionDeadlineAtMs = null;
        if (!canRetain()) {
          committedPostIds = new Set();
          return;
        }

        const latestVisiblePostIds = commit(latestPostIds);
        const activeVideoId = getActiveVideoId();
        if (
          activeVideoId !== null &&
          shouldClearFeedActiveVideo({
            activeVideoId,
            visiblePostIds: latestVisiblePostIds,
          })
        ) {
          onClearActiveVideo(activeVideoId);
        }
      }, Math.max(0, nextRetentionDeadlineAtMs - Date.now()));
    }

    return visiblePostIds;
  };

  const clear = ({
    publish: shouldPublish = true,
    resetLatest = false,
  }: ClearProfileVisibleMediaOptions = {}) => {
    cancelRetentionTimer();
    if (resetLatest) latestPostIds = [];
    committedPostIds = new Set();
    if (shouldPublish) onCommit(committedPostIds);
  };

  const dispose = () => {
    cancelRetentionTimer();
    latestPostIds = [];
    committedPostIds = new Set();
  };

  return {
    clear,
    dispose,
    getLatestPostIds: () => [...latestPostIds],
    publish,
  };
}
