import type {
  FeedPost,
  FeedVideoPost,
} from '../../../domain/types/feed.types';
import {
  mergePendingVideoSnapshots,
  resolveDeferredFeedCommit,
  resolveDeferredFeedPreservedPosts,
} from '../feedDeferredCommit';

const lightPost = (id: string, postedAt: number) =>
  ({ id, kind: 'text', postedAt }) as FeedPost;

const videoPost = (id: string, postedAt: number) =>
  ({ id, kind: 'video', postedAt }) as FeedVideoPost;

describe('resolveDeferredFeedCommit', () => {
  it('keeps light posts appended after the deferred snapshot was captured', () => {
    const initialLight = [lightPost('a', 4), lightPost('b', 3)];
    const latestLight = [
      ...initialLight,
      lightPost('c', 2),
      lightPost('d', 1),
    ];

    const result = resolveDeferredFeedCommit({
      latestLightPosts: latestLight,
      latestVideoPosts: [],
      pendingVideoPosts: [videoPost('video-1', 3.5)],
    });

    expect(result.lightPosts.map(post => post.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(result.videoPosts.map(post => post.id)).toEqual(['video-1']);
  });

  it('applies a deferred fresh light snapshot and retains rows appended while scrolling', () => {
    const cachedHead = lightPost('cached-head', 4);
    const cachedTail = lightPost('cached-tail', 1);
    const freshHead = lightPost('fresh-head', 5);
    const pendingCachedHead = {
      ...cachedHead,
      text: 'fresh network value',
    } as unknown as FeedPost;

    const result = resolveDeferredFeedCommit({
      latestLightPosts: [cachedHead, cachedTail, lightPost('appended', 0)],
      latestVideoPosts: [],
      pendingLightPosts: [freshHead, pendingCachedHead, cachedTail],
      pendingVideoPosts: [],
    });

    expect(result.lightPosts.map(post => post.id)).toEqual([
      'fresh-head',
      'cached-head',
      'cached-tail',
      'appended',
    ]);
    expect(result.lightPosts[1]).toBe(pendingCachedHead);
  });

  it('preserves current video updates and only appends newly prepared videos', () => {
    const currentVideo = videoPost('video-1', 5);
    const staleVideo = { ...currentVideo, postedAt: 1 } as FeedVideoPost;

    const result = resolveDeferredFeedCommit({
      latestLightPosts: [],
      latestVideoPosts: [currentVideo],
      pendingVideoPosts: [staleVideo, videoPost('video-2', 4)],
    });

    expect(result.videoPosts).toEqual([
      currentVideo,
      expect.objectContaining({ id: 'video-2' }),
    ]);
  });

  it('merges multiple video batches queued during one fling', () => {
    const merged = mergePendingVideoSnapshots(
      [videoPost('video-1', 3)],
      [videoPost('video-1', 3), videoPost('video-2', 2)],
    );

    expect(merged.map(post => post.id)).toEqual(['video-1', 'video-2']);
  });

  it('does not accidentally preserve the old head when a deferred initial video should backfill it', () => {
    const renderedPosts = [lightPost('a', 2), lightPost('b', 1)];

    expect(
      resolveDeferredFeedPreservedPosts({
        preserveRenderedOrder: false,
        renderedPosts,
      }),
    ).toBeUndefined();
    expect(
      resolveDeferredFeedPreservedPosts({
        preserveRenderedOrder: true,
        renderedPosts,
      }),
    ).toBe(renderedPosts);
  });
});
