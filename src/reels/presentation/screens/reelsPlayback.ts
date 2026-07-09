export const videoPlaybackTimes = new Map<string, number>();

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
  videoPlaybackTimes.set(key, normalizeVideoPlaybackTime(time));
}

export function isReelItemActive({
  isScreenFocused,
  index,
  activeIndex,
}: {
  isScreenFocused: boolean;
  isCommentsOpen: boolean;
  index: number;
  activeIndex: number;
}) {
  return isScreenFocused && index === activeIndex;
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
