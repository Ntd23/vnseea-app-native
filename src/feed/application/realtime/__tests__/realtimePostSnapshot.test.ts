import type {
  FeedTextPost,
  FeedVideoPost,
} from '../../../domain/types/feed.types';
import { stabilizeRealtimePostSnapshot } from '../realtimePostSnapshot';

const publisher = {
  id: '7',
  name: 'VNSEEA',
  username: 'vnseea',
};

function createTextPost(overrides: Partial<FeedTextPost> = {}): FeedTextPost {
  return {
    kind: 'text',
    id: '42',
    photos: ['https://demo.vnseea.vn/upload/avatar.jpg'],
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    privacy: 'public',
    publisher,
    ...overrides,
  };
}

function createVideoPost(overrides: Partial<FeedVideoPost> = {}): FeedVideoPost {
  return {
    kind: 'video',
    id: '43',
    videoUrl: 'https://demo.vnseea.vn/upload/video.mp4',
    thumbnailUrl: 'https://demo.vnseea.vn/upload/video.jpg',
    mediaGeometry: { width: 1080, height: 1920, aspectRatio: 9 / 16 },
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    privacy: 'public',
    publisher,
    ...overrides,
  };
}

describe('stabilizeRealtimePostSnapshot', () => {
  it('updates image-post engagement without replacing mounted photo URLs', () => {
    const current = createTextPost();
    const snapshot = createTextPost({
      photos: ['https://demo.vnseea.vn/upload/avatar_full.jpg'],
      likeCount: 1,
      isLiked: true,
      myReaction: 'like',
      topReactions: ['like'],
    });

    const result = stabilizeRealtimePostSnapshot(current, snapshot);

    expect(result).toMatchObject({
      likeCount: 1,
      isLiked: true,
      myReaction: 'like',
      topReactions: ['like'],
    });
    expect(result.kind).toBe('text');
    if (result.kind !== 'text') throw new Error('Expected a text post');
    expect(result.photos).toBe(current.photos);
  });

  it('keeps mounted video identity and geometry during realtime engagement refreshes', () => {
    const current = createVideoPost();
    const snapshot = createVideoPost({
      videoUrl: 'https://demo.vnseea.vn/upload/video-alias.mp4',
      thumbnailUrl: 'https://demo.vnseea.vn/upload/video-alias.jpg',
      mediaGeometry: undefined,
      likeCount: 1,
      isLiked: true,
      myReaction: 'love',
      topReactions: ['love'],
    });

    const result = stabilizeRealtimePostSnapshot(current, snapshot);

    expect(result.kind).toBe('video');
    if (result.kind !== 'video') throw new Error('Expected a video post');
    expect(result.videoUrl).toBe(current.videoUrl);
    expect(result.thumbnailUrl).toBe(current.thumbnailUrl);
    expect(result.mediaGeometry).toBe(current.mediaGeometry);
    expect(result.myReaction).toBe('love');
  });

  it('accepts snapshot media when the mounted post has none yet', () => {
    const current = createTextPost({ photos: [] });
    const snapshot = createTextPost({
      photos: ['https://demo.vnseea.vn/upload/new-photo.jpg'],
    });

    const result = stabilizeRealtimePostSnapshot(current, snapshot);

    expect(result.kind).toBe('text');
    if (result.kind !== 'text') throw new Error('Expected a text post');
    expect(result.photos).toBe(snapshot.photos);
  });
});
