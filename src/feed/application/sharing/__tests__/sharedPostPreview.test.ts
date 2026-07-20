jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://demo.vnseea.vn/api',
  WEB_BASE_URL: 'https://demo.vnseea.vn',
  SERVER_KEY: 'test-server-key',
  REQUEST_TIMEOUT_MS: '10000',
}));
jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: { post: jest.fn() },
}));
jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: { getSession: () => null },
}));
jest.mock('../../../../reels/infrastructure/storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: { get: () => null },
}));

import { mapFeedPost } from '../../../infrastructure/repositories/ApiFeedRepository';
import { isFeedPostShareable } from '../../../domain/policies/feedPostPrivacy';
import {
  applySharedPostSourceSnapshot,
  buildSharedPostPreviewModel,
  getPostRealtimeWatchIds,
} from '../sharedPostPreview';
import type { FeedPost } from '../../../domain/types/feed.types';

const publisher = {
  user_id: '10',
  username: 'duong',
  name: 'Ha Dai Duong',
  avatar: 'https://cdn.vnseea.test/duong.jpg',
};

function rawPost(overrides: Record<string, unknown> = {}) {
  return {
    id: '500',
    postText: 'Ghi chu cua nguoi chia se',
    postPrivacy: '0',
    time: '1700000000',
    postLikes: '2',
    post_comments: '3',
    publisher,
    can_share: true,
    ...overrides,
  };
}

describe('shared post preview mapping', () => {
  it('keeps the outer note separate from source caption and photos', () => {
    const post = mapFeedPost(
      rawPost({
        parent_id: '100',
        shared_info: rawPost({
          id: '100',
          postText: 'Noi dung bai nguon',
          postFile: 'https://cdn.vnseea.test/source.jpg',
          postType: 'photo',
        }),
      }),
    );

    expect(post.kind).toBe('text');
    expect(post.caption).toBe('Ghi chu cua nguoi chia se');
    if (post.kind !== 'text') throw new Error('Expected text outer post');
    expect(post.photos).toEqual([]);
    expect(post.sharedPostId).toBe('100');
    expect(post.sharedPost).toMatchObject({
      postId: '100',
      caption: 'Noi dung bai nguon',
      content: {
        kind: 'text',
        photos: ['https://cdn.vnseea.test/source.jpg'],
      },
    });
  });

  it('maps a shared source video as one outer video item for feed autoplay', () => {
    const post = mapFeedPost(
      rawPost({
        parent_id: '101',
        shared_info: rawPost({
          id: '101',
          postText: 'Video nguon',
          postType: 'video',
          postFile: 'https://cdn.vnseea.test/source.mp4',
          postFileThumb: 'https://cdn.vnseea.test/source-thumb.jpg',
        }),
      }),
    );

    expect(post).toMatchObject({
      kind: 'video',
      id: '500',
      caption: 'Ghi chu cua nguoi chia se',
      videoUrl: 'https://cdn.vnseea.test/source.mp4',
      thumbnailUrl: 'https://cdn.vnseea.test/source-thumb.jpg',
      sharedPostId: '101',
      sharedPost: {
        postId: '101',
        caption: 'Video nguon',
        content: {
          kind: 'video',
          videoUrl: 'https://cdn.vnseea.test/source.mp4',
          thumbnailUrl: 'https://cdn.vnseea.test/source-thumb.jpg',
        },
      },
    });
  });

  it('keeps source attachment metadata inside the nested preview', () => {
    const post = mapFeedPost(
      rawPost({
        parent_id: '102',
        shared_info: rawPost({
          id: '102',
          postText: '',
          product: {
            name: 'May anh',
            price_format: '2.000.000 d',
            images: [{ image: 'https://cdn.vnseea.test/product.jpg' }],
          },
        }),
      }),
    );

    expect(post.sharedPost?.content).toEqual({
      kind: 'attachment',
      attachmentKind: 'product',
      title: 'May anh',
      subtitle: '2.000.000 d',
      imageUrl: 'https://cdn.vnseea.test/product.jpg',
    });
  });

  it('does not allow an already shared post to be shared again', () => {
    const post = {
      kind: 'text',
      id: '500',
      photos: [],
      publisher: { id: '10', name: 'Duong', username: 'duong' },
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      myReaction: null,
      topReactions: [],
      privacy: 'public',
      permissions: { canDelete: true, canShare: true },
      sharedPostId: '100',
    } as FeedPost;

    expect(isFeedPostShareable(post)).toBe(false);
  });

  it('watches both outer and source IDs and applies source snapshots without replacing outer stats', () => {
    const outer = mapFeedPost(
      rawPost({
        parent_id: '101',
        shared_info: rawPost({
          id: '101',
          postType: 'video',
          postFile: 'https://cdn.vnseea.test/old.mp4',
        }),
      }),
    );
    const source = mapFeedPost(
      rawPost({
        id: '101',
        postText: 'Caption moi',
        postType: 'video',
        postFile: 'https://cdn.vnseea.test/new.mp4',
      }),
    );

    expect(getPostRealtimeWatchIds([outer], [outer.id])).toEqual(['500', '101']);
    const updated = applySharedPostSourceSnapshot(outer, source);
    expect(updated).toMatchObject({
      id: '500',
      likeCount: 2,
      videoUrl: 'https://cdn.vnseea.test/new.mp4',
      sharedPost: { postId: '101', caption: 'Caption moi' },
    });
  });

  it.each([
    [
      'poll',
      {
        kind: 'poll',
        pollQuestion: 'Ban chon gi?',
        options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
      },
      { kind: 'poll', question: 'Ban chon gi?', options: ['A', 'B', 'C'] },
    ],
    [
      'product',
      {
        kind: 'product',
        product: {
          name: 'May anh',
          price_format: '2.000.000 d',
          images: [{ image: 'https://cdn.vnseea.test/product.jpg' }],
        },
      },
      {
        kind: 'attachment',
        attachmentKind: 'product',
        title: 'May anh',
        subtitle: '2.000.000 d',
        imageUrl: 'https://cdn.vnseea.test/product.jpg',
      },
    ],
    [
      'event',
      {
        kind: 'event',
        event: {
          event_name: 'VNSEEA Meetup',
          event_location: 'Ha Noi',
          event_cover: 'https://cdn.vnseea.test/event.jpg',
        },
      },
      {
        kind: 'attachment',
        attachmentKind: 'event',
        title: 'VNSEEA Meetup',
        subtitle: 'Ha Noi',
        imageUrl: 'https://cdn.vnseea.test/event.jpg',
      },
    ],
  ])('builds the common preview model for %s posts', (_kind, fields, expected) => {
    const post = {
      id: 'source-1',
      publisher: { id: '10', name: 'Duong', username: 'duong' },
      postedAt: 1700000000,
      privacy: 'public',
      ...fields,
    } as unknown as FeedPost;

    expect(buildSharedPostPreviewModel(post).content).toEqual(expected);
  });
});
