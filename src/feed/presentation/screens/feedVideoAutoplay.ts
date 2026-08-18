export type FeedVideoAutoplayCandidate = {
  id: string;
  y: number;
  height: number;
};

const DEFAULT_MIN_VISIBLE_RATIO = 0.6;
const DEFAULT_VIEWPORT_CENTER_RATIO = 0.52;

export function getFeedVideoPlaybackPolicy(platform: string) {
  const isAndroid = platform === 'android';

  return {
    warmBehindItems: 0,
    warmAheadItems: isAndroid ? 0 : 1,
    idleWarmMaxCount: isAndroid ? 0 : 1,
    scrollingWarmMaxCount: 0,
    posterPrefetchBehindItems: 0,
    posterPrefetchAheadItems: isAndroid ? 1 : 2,
  } as const;
}

export function resolvePlaybackSurfaceFocused({
  routeFocused,
  appActive,
}: {
  routeFocused: boolean;
  appActive: boolean;
}) {
  return routeFocused && appActive;
}

export function resolvePlaybackSurfaceVisibleMediaPostIds({
  surfaceFocused,
  latestVisiblePostIds,
}: {
  surfaceFocused: boolean;
  latestVisiblePostIds: readonly string[];
}) {
  return surfaceFocused ? latestVisiblePostIds : [];
}

function getVisibleHeight(y: number, height: number, viewportHeight: number) {
  return Math.max(0, Math.min(y + height, viewportHeight) - Math.max(y, 0));
}

export function pickFeedVideoAutoplayCandidate({
  candidates,
  viewportHeight,
  minVisibleRatio = DEFAULT_MIN_VISIBLE_RATIO,
  viewportCenterRatio = DEFAULT_VIEWPORT_CENTER_RATIO,
}: {
  candidates: FeedVideoAutoplayCandidate[];
  viewportHeight: number;
  minVisibleRatio?: number;
  viewportCenterRatio?: number;
}) {
  const viewportCenter = viewportHeight * viewportCenterRatio;
  let bestVideoId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach(candidate => {
    if (candidate.height <= 0) return;

    const visibleHeight = getVisibleHeight(
      candidate.y,
      candidate.height,
      viewportHeight,
    );
    const visibleRatio = visibleHeight / candidate.height;

    if (visibleRatio < minVisibleRatio) return;

    const distance = Math.abs(
      candidate.y + candidate.height / 2 - viewportCenter,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestVideoId = candidate.id;
    }
  });

  return bestVideoId;
}

export function getFeedVideoActiveUpdate({
  activeVideoId,
  isScrolling,
  candidates,
  viewportHeight,
}: {
  activeVideoId: string | null;
  isScrolling: boolean;
  candidates: FeedVideoAutoplayCandidate[];
  viewportHeight: number;
}): {
  nextActiveVideoId: string | null | undefined;
  pendingActiveVideoId: string | null;
} {
  const nextViewableVideoId = pickFeedVideoAutoplayCandidate({
    candidates,
    viewportHeight,
  });
  const activeCandidate = candidates.find(
    candidate => candidate.id === activeVideoId,
  );
  const activeVideoStillVisible = Boolean(
    activeCandidate &&
      activeCandidate.height > 0 &&
      getVisibleHeight(
        activeCandidate.y,
        activeCandidate.height,
        viewportHeight,
      ) > 0,
  );

  if (!isScrolling) {
    return {
      nextActiveVideoId:
        nextViewableVideoId ??
        (activeVideoId && activeVideoStillVisible ? activeVideoId : null),
      pendingActiveVideoId: null,
    };
  }

  return {
    nextActiveVideoId:
      activeVideoId && !activeVideoStillVisible ? null : undefined,
    pendingActiveVideoId: nextViewableVideoId,
  };
}

export function shouldMeasureFeedVideoDuringScroll({
  lastMeasuredAtMs,
  nowMs,
  minIntervalMs,
}: {
  lastMeasuredAtMs: number | null;
  nowMs: number;
  minIntervalMs: number;
}) {
  if (lastMeasuredAtMs === null) return true;
  return nowMs - lastMeasuredAtMs >= minIntervalMs;
}

export function selectFeedVideoMeasurementIds({
  mountedVideoIds,
  priorityVideoIds,
  maxCount,
}: {
  mountedVideoIds: string[];
  priorityVideoIds: Array<string | null | undefined>;
  maxCount: number;
}) {
  if (maxCount <= 0 || mountedVideoIds.length === 0) return [];

  const mountedIds = new Set(mountedVideoIds);
  const selectedIds: string[] = [];
  const selectedSet = new Set<string>();

  for (const priorityVideoId of priorityVideoIds) {
    if (!priorityVideoId) continue;
    if (!mountedIds.has(priorityVideoId)) continue;
    if (selectedSet.has(priorityVideoId)) continue;

    selectedSet.add(priorityVideoId);
    selectedIds.push(priorityVideoId);
    if (selectedIds.length >= maxCount) break;
  }

  for (const mountedVideoId of mountedVideoIds) {
    if (selectedIds.length >= maxCount) break;
    if (selectedSet.has(mountedVideoId)) continue;
    selectedSet.add(mountedVideoId);
    selectedIds.push(mountedVideoId);
  }

  return selectedIds;
}

export function shouldMountWarmFeedVideo({
  platform,
  optimizationEnabled,
  isWarm,
  isScrollBusy,
  shouldKeepPreparedVideoMounted,
  wasPlayerSurfaceMounted = false,
}: {
  platform: string;
  optimizationEnabled: boolean;
  isWarm: boolean;
  isScrollBusy: boolean;
  shouldKeepPreparedVideoMounted: boolean;
  wasPlayerSurfaceMounted?: boolean;
}) {
  if (!isWarm) return false;
  if (platform === 'android' && isScrollBusy) return false;
  if (!optimizationEnabled) {
    return isWarm || !isScrollBusy || shouldKeepPreparedVideoMounted;
  }

  return (
    !isScrollBusy || shouldKeepPreparedVideoMounted || wasPlayerSurfaceMounted
  );
}

export function resolveFeedVisibleMediaPostIds({
  previousVisiblePostIds,
  nextVisiblePostIds,
  availablePostIds,
  allowTransientEmptyRetention,
}: {
  previousVisiblePostIds: Iterable<string>;
  nextVisiblePostIds: Iterable<string>;
  availablePostIds: Pick<ReadonlySet<string>, 'has'>;
  allowTransientEmptyRetention: boolean;
}) {
  const nextIds = Array.from(new Set(nextVisiblePostIds));
  if (!allowTransientEmptyRetention) {
    return nextIds;
  }

  const resolvedIds = [...nextIds];
  const seenIds = new Set(nextIds);
  for (const postId of previousVisiblePostIds) {
    if (!seenIds.has(postId) && availablePostIds.has(postId)) {
      seenIds.add(postId);
      resolvedIds.push(postId);
    }
  }
  return resolvedIds;
}

export function resolveFeedVisibleMediaRetentionDeadline({
  currentDeadlineAtMs,
  nowMs,
  retentionDurationMs,
  allowTransientRetention,
  hasRetainedPostIds,
}: {
  currentDeadlineAtMs: number | null;
  nowMs: number;
  retentionDurationMs: number;
  allowTransientRetention: boolean;
  hasRetainedPostIds: boolean;
}) {
  if (!allowTransientRetention || !hasRetainedPostIds) return null;
  if (currentDeadlineAtMs !== null) {
    return currentDeadlineAtMs > nowMs ? currentDeadlineAtMs : null;
  }
  return nowMs + Math.max(0, retentionDurationMs);
}

export function shouldClearFeedActiveVideo({
  activeVideoId,
  visiblePostIds,
}: {
  activeVideoId: string | null;
  visiblePostIds: Iterable<string>;
}) {
  if (activeVideoId === null) return false;
  for (const postId of visiblePostIds) {
    if (postId === activeVideoId) return false;
  }
  return true;
}

export function getRetainedFeedVideoPosterKeys({
  pendingKeys,
  requestedKeys,
  maxCount,
}: {
  pendingKeys: string[];
  requestedKeys: string[];
  maxCount: number;
}) {
  if (maxCount <= 0) return [];

  const requestedKeySet = new Set(requestedKeys);
  const retainedKeys = pendingKeys.filter(key => requestedKeySet.has(key));
  return retainedKeys.slice(-maxCount);
}

export function shouldCommitFeedChromeVisibility({
  optimizationEnabled,
  current,
  next,
}: {
  optimizationEnabled: boolean;
  current: boolean;
  next: boolean;
}) {
  return !optimizationEnabled || current !== next;
}

export function shouldMeasureFeedVideoPosterAspectRatio(platform: string) {
  return platform !== 'android';
}

export function shouldPlayFeedVideo({
  shouldMountVideo,
  isActive,
  manuallyPaused,
}: {
  shouldMountVideo: boolean;
  isActive: boolean;
  isWarm: boolean;
  manuallyPaused: boolean;
}) {
  return shouldMountVideo && isActive && !manuallyPaused;
}
