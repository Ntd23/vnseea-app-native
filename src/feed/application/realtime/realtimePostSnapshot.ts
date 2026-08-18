import type { FeedPost } from '../../domain/types/feed.types';

/**
 * Realtime refreshes are triggered by engagement mutations, but detail and
 * list endpoints can return different aliases for the same media. Keep the
 * already-mounted media identity so an engagement-only refresh cannot remount
 * the native image/video surface or change its reserved geometry.
 */
export function stabilizeRealtimePostSnapshot(
  currentPost: FeedPost,
  nextPost: FeedPost,
): FeedPost {
  if (
    String(currentPost.id) !== String(nextPost.id) ||
    currentPost.kind !== nextPost.kind
  ) {
    return nextPost;
  }

  if (currentPost.kind === 'text' && nextPost.kind === 'text') {
    return {
      ...nextPost,
      photos:
        currentPost.photos.length > 0 ? currentPost.photos : nextPost.photos,
      audioUrl: currentPost.audioUrl ?? nextPost.audioUrl,
    };
  }

  if (currentPost.kind === 'video' && nextPost.kind === 'video') {
    return {
      ...nextPost,
      videoUrl: currentPost.videoUrl || nextPost.videoUrl,
      thumbnailUrl: currentPost.thumbnailUrl ?? nextPost.thumbnailUrl,
      mediaGeometry: currentPost.mediaGeometry ?? nextPost.mediaGeometry,
    };
  }

  return nextPost;
}
