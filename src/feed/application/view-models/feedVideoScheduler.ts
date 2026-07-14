import type {
  FeedPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';

export type FeedVideoMixConfig = {
  /**
   * Desired video share in the final home-feed post lane.
   * Example: 0.2 means roughly 1 video per 4 non-video posts when supply allows.
   */
  targetVideoShare: number;
  /**
   * Lower/upper safety rails keep the mix tunable without falling back to a
   * hard-coded "N normal posts, then one video" pattern.
   */
  minVideoShare: number;
  maxVideoShare: number;
  minNonVideoItemsBetweenVideos: number;
  maxNonVideoItemsBetweenVideos: number;
  firstVideoAfterItems: number;
};

export type MergeFeedContentOptions = Partial<FeedVideoMixConfig> & {
  /**
   * Keeps already-rendered rows in place when a secondary video fetch finishes.
   * New videos are then scheduled into the not-yet-rendered tail, so background
   * buffering cannot shove visible feed cards down the screen.
   */
  preserveExistingPosts?: readonly FeedPost[];
  /**
   * Lets the view-model keep a video out of the render lane until its poster
   * is already available. This avoids the "black card, then decode on-screen"
   * path on slower Android devices.
   */
  videoReadiness?: (videoPost: FeedVideoPost) => boolean;
};

export const DEFAULT_FEED_VIDEO_MIX_CONFIG: FeedVideoMixConfig = {
  targetVideoShare: 0.2,
  minVideoShare: 0.1,
  maxVideoShare: 0.35,
  minNonVideoItemsBetweenVideos: 2,
  maxNonVideoItemsBetweenVideos: 8,
  firstVideoAfterItems: 3,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ceilStable(value: number) {
  return Math.ceil(value - 1e-9);
}

function normalizeConfig(
  overrides: Partial<FeedVideoMixConfig> = {},
): FeedVideoMixConfig {
  const base = { ...DEFAULT_FEED_VIDEO_MIX_CONFIG, ...overrides };
  const minGap = Math.max(1, Math.floor(base.minNonVideoItemsBetweenVideos));
  const maxGap = Math.max(
    minGap,
    Math.floor(base.maxNonVideoItemsBetweenVideos),
  );
  const minShare = clamp(base.minVideoShare, 0.01, 0.9);
  const maxShare = clamp(base.maxVideoShare, minShare, 0.9);

  return {
    targetVideoShare: clamp(base.targetVideoShare, minShare, maxShare),
    minVideoShare: minShare,
    maxVideoShare: maxShare,
    minNonVideoItemsBetweenVideos: minGap,
    maxNonVideoItemsBetweenVideos: maxGap,
    firstVideoAfterItems: clamp(
      Math.floor(base.firstVideoAfterItems),
      minGap,
      maxGap,
    ),
  };
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item?.id || map.has(item.id)) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function calculateTargetVideoCount(
  lightCount: number,
  availableVideoCount: number,
  config: FeedVideoMixConfig,
) {
  if (lightCount <= 0 || availableVideoCount <= 0) {
    return availableVideoCount;
  }

  const targetFromShare = ceilStable(
    (lightCount * config.targetVideoShare) /
      Math.max(0.01, 1 - config.targetVideoShare),
  );
  const targetFromMaxGap = ceilStable(
    lightCount / config.maxNonVideoItemsBetweenVideos,
  );

  return Math.min(
    availableVideoCount,
    Math.max(1, targetFromShare, targetFromMaxGap),
  );
}

export function getFeedVideoBufferTarget(
  lightCount: number,
  overrides: Partial<FeedVideoMixConfig> = {},
) {
  const config = normalizeConfig(overrides);
  if (lightCount <= 0) return 2;

  const targetFromShare = ceilStable(
    (lightCount * config.targetVideoShare) /
      Math.max(0.01, 1 - config.targetVideoShare),
  );
  const targetFromMaxGap = ceilStable(
    lightCount / config.maxNonVideoItemsBetweenVideos,
  );

  return Math.max(2, targetFromShare, targetFromMaxGap) + 2;
}

function scheduleVideosIntoLightPosts(
  lightPosts: readonly FeedPost[],
  videoPosts: readonly FeedVideoPost[],
  config: FeedVideoMixConfig,
): FeedPost[] {
  if (lightPosts.length === 0) {
    return [...videoPosts];
  }

  if (videoPosts.length === 0) {
    return [...lightPosts];
  }

  const plannedVideoCount = calculateTargetVideoCount(
    lightPosts.length,
    videoPosts.length,
    config,
  );
  const effectiveVideoShare = clamp(
    plannedVideoCount / Math.max(1, lightPosts.length + plannedVideoCount),
    config.minVideoShare,
    config.maxVideoShare,
  );
  const targetGap = clamp(
    Math.round((1 - effectiveVideoShare) / effectiveVideoShare),
    config.minNonVideoItemsBetweenVideos,
    config.maxNonVideoItemsBetweenVideos,
  );

  const result: FeedPost[] = [];
  let videoIndex = 0;
  let nonVideoSinceLastVideo = 0;

  lightPosts.forEach((post, index) => {
    result.push(post);
    nonVideoSinceLastVideo += 1;

    if (videoIndex >= plannedVideoCount) return;

    const isFirstVideo = videoIndex === 0;
    const desiredGap = isFirstVideo ? config.firstVideoAfterItems : targetGap;
    const hasMinimumSpacing =
      nonVideoSinceLastVideo >= config.minNonVideoItemsBetweenVideos;
    const reachedDesiredGap = nonVideoSinceLastVideo >= desiredGap;
    const reachedMaxGap =
      nonVideoSinceLastVideo >= config.maxNonVideoItemsBetweenVideos;
    const reachedEndWithSpacing =
      index === lightPosts.length - 1 && hasMinimumSpacing;

    if (
      hasMinimumSpacing &&
      (reachedDesiredGap || reachedMaxGap || reachedEndWithSpacing)
    ) {
      result.push(videoPosts[videoIndex]);
      videoIndex += 1;
      nonVideoSinceLastVideo = 0;
    }
  });

  return result;
}

export function mergeFeedContentWithVideos(
  lightPosts: readonly FeedPost[],
  videoPosts: readonly FeedVideoPost[],
  options: MergeFeedContentOptions = {},
): FeedPost[] {
  const { preserveExistingPosts, videoReadiness, ...configOverrides } = options;
  const config = normalizeConfig(configOverrides);
  const lightIds = new Set(lightPosts.map(post => post.id));
  const usableVideos = uniqueById(videoPosts).filter(
    video =>
      !lightIds.has(video.id) &&
      (videoReadiness ? videoReadiness(video) : true),
  );

  if (preserveExistingPosts?.length) {
    const lightById = new Map(lightPosts.map(post => [post.id, post]));
    const videoById = new Map(usableVideos.map(post => [post.id, post]));
    const seenIds = new Set<string>();
    const preservedPosts: FeedPost[] = [];

    for (const previousPost of preserveExistingPosts) {
      const sourcePost =
        lightById.get(previousPost.id) ?? videoById.get(previousPost.id);
      if (!sourcePost || seenIds.has(sourcePost.id)) continue;

      preservedPosts.push(sourcePost);
      seenIds.add(sourcePost.id);
    }

    if (preservedPosts.length > 0) {
      const remainingLightPosts = lightPosts.filter(
        post => !seenIds.has(post.id),
      );
      const remainingVideos = usableVideos.filter(
        post => !seenIds.has(post.id),
      );

      if (remainingLightPosts.length > 0) {
        return [
          ...preservedPosts,
          ...scheduleVideosIntoLightPosts(
            remainingLightPosts,
            remainingVideos,
            config,
          ),
        ];
      }

      const lastPreservedPost = preservedPosts[preservedPosts.length - 1];
      if (remainingVideos.length > 0 && lastPreservedPost?.kind !== 'video') {
        return [...preservedPosts, remainingVideos[0]];
      }

      return preservedPosts;
    }
  }

  return scheduleVideosIntoLightPosts(lightPosts, usableVideos, config);
}
