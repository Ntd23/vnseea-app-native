export type FeedVideoAutoplayCandidate = {
  id: string;
  y: number;
  height: number;
};

export type FeedVideoViewableItem = {
  isViewable?: boolean;
  item?: {
    type?: string;
    post?: {
      kind?: string;
      id?: string | number;
    };
  };
};

const DEFAULT_MIN_VISIBLE_RATIO = 0.5;
const DEFAULT_VIEWPORT_CENTER_RATIO = 0.52;

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

export function pickFeedViewableVideoId(
  viewableItems: FeedVideoViewableItem[],
) {
  const viewableVideo = viewableItems.find(
    item =>
      item.isViewable &&
      item.item?.type === 'post' &&
      item.item.post?.kind === 'video',
  );

  return viewableVideo ? String(viewableVideo.item?.post?.id) : null;
}

export function isFeedVideoIdViewable(
  viewableItems: FeedVideoViewableItem[],
  videoId: string | null,
) {
  if (!videoId) return false;

  return viewableItems.some(
    item =>
      item.isViewable &&
      item.item?.type === 'post' &&
      item.item.post?.kind === 'video' &&
      String(item.item.post.id) === videoId,
  );
}

export function getFeedVideoActiveUpdate({
  activeVideoId,
  isScrolling,
  viewableItems,
  visibleItems = viewableItems,
}: {
  activeVideoId: string | null;
  isScrolling: boolean;
  viewableItems: FeedVideoViewableItem[];
  /**
   * Uses a much lower visibility threshold than `viewableItems`. The active
   * video stays alive while even a small part of its card is still on-screen,
   * while `viewableItems` remains responsible for choosing the next autoplay
   * candidate.
   */
  visibleItems?: FeedVideoViewableItem[];
}): {
  nextActiveVideoId: string | null | undefined;
  pendingActiveVideoId: string | null;
} {
  const nextViewableVideoId = pickFeedViewableVideoId(viewableItems);
  const activeVideoStillVisible = isFeedVideoIdViewable(
    visibleItems,
    activeVideoId,
  );

  if (!isScrolling) {
    return {
      nextActiveVideoId:
        nextViewableVideoId ??
        (activeVideoId && activeVideoStillVisible ? undefined : null),
      pendingActiveVideoId: null,
    };
  }

  return {
    nextActiveVideoId:
      activeVideoId && !activeVideoStillVisible ? null : undefined,
    pendingActiveVideoId: nextViewableVideoId,
  };
}
