import type {
  FeedPost,
  FeedVideoPost,
} from '../../../domain/types/feed.types';
import {
  getFeedVideoBufferTarget,
  mergeFeedContentWithVideos,
} from '../feedVideoScheduler';

function lightPost(id: string): FeedPost {
  return { id, kind: 'text', postedAt: 100 } as FeedPost;
}

function videoPost(id: string): FeedVideoPost {
  return { id, kind: 'video', postedAt: 90, videoUrl: `${id}.mp4` } as FeedVideoPost;
}

function postKinds(posts: FeedPost[]) {
  return posts.map(post => post.kind);
}

describe('feed video scheduler', () => {
  it('uses a tunable video mix instead of the old fixed five-post interval', () => {
    const light = Array.from({ length: 12 }, (_, index) =>
      lightPost(`post-${index + 1}`),
    );
    const videos = Array.from({ length: 6 }, (_, index) =>
      videoPost(`video-${index + 1}`),
    );

    const merged = mergeFeedContentWithVideos(light, videos);
    const videoPositions = merged
      .map((post, index) => (post.kind === 'video' ? index : -1))
      .filter(index => index >= 0);

    expect(videoPositions).toEqual([3, 8, 13]);
    expect(postKinds(merged).slice(0, 5)).toEqual([
      'text',
      'text',
      'text',
      'video',
      'text',
    ]);
  });

  it('preserves non-video order and avoids adjacent videos while alternatives exist', () => {
    const light = Array.from({ length: 10 }, (_, index) =>
      lightPost(`post-${index + 1}`),
    );
    const videos = Array.from({ length: 10 }, (_, index) =>
      videoPost(`video-${index + 1}`),
    );

    const merged = mergeFeedContentWithVideos(light, videos);
    expect(merged.filter(post => post.kind !== 'video').map(post => post.id))
      .toEqual(light.map(post => post.id));

    for (let index = 1; index < merged.length; index += 1) {
      expect([merged[index - 1].kind, merged[index].kind]).not.toEqual([
        'video',
        'video',
      ]);
    }
  });

  it('dedupes videos and never inserts a video with the same id as an existing post', () => {
    const light = [lightPost('post-1'), lightPost('video-1'), lightPost('post-2')];
    const videos = [videoPost('video-1'), videoPost('video-2'), videoPost('video-2')];

    const merged = mergeFeedContentWithVideos(light, videos);

    expect(merged.map(post => post.id)).toEqual([
      'post-1',
      'video-1',
      'post-2',
      'video-2',
    ]);
  });

  it('can still render a video-only lane when no light posts are available', () => {
    const videos = [videoPost('video-1'), videoPost('video-2')];

    expect(mergeFeedContentWithVideos([], videos).map(post => post.id)).toEqual([
      'video-1',
      'video-2',
    ]);
  });

  it('keeps unprepared videos out of the mixed lane until they are ready', () => {
    const light = Array.from({ length: 6 }, (_, index) =>
      lightPost(`post-${index + 1}`),
    );
    const videos = [videoPost('video-1'), videoPost('video-2')];

    const merged = mergeFeedContentWithVideos(light, videos, {
      videoReadiness: video => video.id === 'video-2',
    });

    expect(merged.map(post => post.id)).toEqual([
      'post-1',
      'post-2',
      'post-3',
      'video-2',
      'post-4',
      'post-5',
      'post-6',
    ]);
    expect(merged.some(post => post.id === 'video-1')).toBe(false);
  });

  it('preserves already-rendered rows when background videos arrive later', () => {
    const firstPage = Array.from({ length: 10 }, (_, index) =>
      lightPost(`post-${index + 1}`),
    );
    const nextLight = [
      ...firstPage,
      lightPost('post-11'),
      lightPost('post-12'),
      lightPost('post-13'),
      lightPost('post-14'),
    ];
    const videos = [videoPost('video-1'), videoPost('video-2')];

    const merged = mergeFeedContentWithVideos(nextLight, videos, {
      preserveExistingPosts: firstPage,
    });

    expect(merged.slice(0, firstPage.length).map(post => post.id)).toEqual(
      firstPage.map(post => post.id),
    );
    expect(merged.map(post => post.id).slice(firstPage.length)).toEqual([
      'post-11',
      'post-12',
      'post-13',
      'video-1',
      'post-14',
    ]);
  });

  it('requests enough secondary video buffer for the dynamic mix', () => {
    expect(getFeedVideoBufferTarget(10)).toBeGreaterThanOrEqual(5);
    expect(getFeedVideoBufferTarget(0)).toBe(2);
  });
});
