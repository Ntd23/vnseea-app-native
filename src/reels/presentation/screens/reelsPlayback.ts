export const videoPlaybackTimes = new Map<string, number>();
const MAX_REMEMBERED_REEL_PLAYBACK_TIMES = 200;

function toPlaybackKey(postId: string | number | null | undefined) {
  if (postId === null || postId === undefined) return null;
  const key = String(postId);
  return key.length > 0 ? key : null;
}

export function normalizeVideoPlaybackTime(time: number | null | undefined) {
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
    return 0;
  }
  return time;
}

export function getVideoPlaybackTime(
  postId: string | number | null | undefined,
  fallback = 0,
) {
  const key = toPlaybackKey(postId);
  if (!key) return normalizeVideoPlaybackTime(fallback);
  const savedTime = videoPlaybackTimes.get(key);
  return normalizeVideoPlaybackTime(
    savedTime === undefined ? fallback : savedTime,
  );
}

export function setVideoPlaybackTime(
  postId: string | number | null | undefined,
  time: number | null | undefined,
) {
  const key = toPlaybackKey(postId);
  if (!key) return;
  if (videoPlaybackTimes.has(key)) {
    videoPlaybackTimes.delete(key);
  }
  videoPlaybackTimes.set(key, normalizeVideoPlaybackTime(time));
  while (videoPlaybackTimes.size > MAX_REMEMBERED_REEL_PLAYBACK_TIMES) {
    const oldestKey = videoPlaybackTimes.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    videoPlaybackTimes.delete(oldestKey);
  }
}

export function isReelItemActive({
  isScreenFocused,
  index,
  activeIndex,
}: {
  isScreenFocused: boolean;
  index: number;
  activeIndex: number;
}) {
  return isScreenFocused && index === activeIndex;
}

export function resolveReelsViewportHeight({
  currentHeight,
  nextHeight,
  commentsOpen,
}: {
  currentHeight: number;
  nextHeight: number;
  commentsOpen: boolean;
}) {
  const normalizedCurrent =
    Number.isFinite(currentHeight) && currentHeight > 0
      ? Math.round(currentHeight)
      : 0;
  const normalizedNext =
    Number.isFinite(nextHeight) && nextHeight > 0
      ? Math.round(nextHeight)
      : normalizedCurrent;

  // Android's adjustResize reports a shorter root layout while the comment
  // keyboard is visible. Changing the pager's item height at that moment
  // changes every snap offset and can expose the next (paused) Reel.
  return commentsOpen && normalizedCurrent > 0
    ? normalizedCurrent
    : normalizedNext;
}

type NavigationRouteLike = {
  key?: string;
  name?: string;
};

type NavigationStateLike = {
  index?: number;
  routes?: NavigationRouteLike[];
};

export function isNavigationRouteSelected(
  state: NavigationStateLike | null | undefined,
  routeKey: string | null | undefined,
  routeName: string | null | undefined,
) {
  if (!state || !Array.isArray(state.routes)) return false;
  const activeIndex = typeof state.index === 'number' ? state.index : 0;
  const activeRoute = state.routes[activeIndex];
  if (!activeRoute) return false;

  if (routeKey && activeRoute.key) {
    return activeRoute.key === routeKey;
  }

  return Boolean(routeName && activeRoute.name === routeName);
}

export function shouldMountReelVideoPlayer({
  isPlaybackRouteFocused,
  index,
  activeIndex,
  preloadRadius,
}: {
  isPlaybackRouteFocused: boolean;
  index: number;
  activeIndex: number;
  preloadRadius: number;
}) {
  return isPlaybackRouteFocused && Math.abs(index - activeIndex) <= preloadRadius;
}

export function shouldPrefetchMoreReels({
  visibleIndex,
  itemCount,
  hasMore,
  isLoadingMore,
  prefetchDistance = 3,
}: {
  visibleIndex: number;
  itemCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  prefetchDistance?: number;
}) {
  if (!hasMore || isLoadingMore || itemCount <= 0 || visibleIndex < 0) {
    return false;
  }

  return visibleIndex >= Math.max(0, itemCount - prefetchDistance);
}
