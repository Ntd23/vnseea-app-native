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

export function pickFeedViewableVideoId(viewableItems: FeedVideoViewableItem[]) {
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
}: {
  activeVideoId: string | null;
  isScrolling: boolean;
  viewableItems: FeedVideoViewableItem[];
}): {
  nextActiveVideoId: string | null | undefined;
  pendingActiveVideoId: string | null;
} {
  const nextViewableVideoId = pickFeedViewableVideoId(viewableItems);

  if (!isScrolling) {
    return {
      nextActiveVideoId: nextViewableVideoId,
      pendingActiveVideoId: null,
    };
  }

  const activeVideoStillViewable = isFeedVideoIdViewable(
    viewableItems,
    activeVideoId,
  );

  return {
    nextActiveVideoId:
      activeVideoId && !activeVideoStillViewable ? null : undefined,
    pendingActiveVideoId: nextViewableVideoId,
  };
}
