import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

const mockSetReaction = jest.fn();

jest.mock('../../../infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({
    setReaction: (...args: unknown[]) => mockSetReaction(...args),
  }),
}));

import type { FeedTextPost } from '../../../domain/types/feed.types';
import { usePostDetailViewModel } from '../usePostDetailViewModel';

const fallbackPost: FeedTextPost = {
  kind: 'text',
  id: '42',
  photos: ['https://demo.vnseea.vn/upload/photo.jpg'],
  likeCount: 4,
  commentCount: 1,
  isLiked: false,
  myReaction: null,
  topReactions: ['haha'],
  reactionBreakdown: { haha: 4 },
  privacy: 'public',
  publisher: {
    id: '7',
    name: 'VNSEEA',
    username: 'vnseea',
  },
};

describe('usePostDetailViewModel reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetReaction.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes an optimistic reaction change so the background feed stays synchronized', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    let latest!: ReturnType<typeof usePostDetailViewModel>;

    function Probe() {
      latest = usePostDetailViewModel({ fallbackPost, postId: '42' });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    await act(async () => {
      await latest.toggleReaction('love');
    });

    expect(latest.post).toMatchObject({
      myReaction: 'love',
      isLiked: true,
      likeCount: 5,
    });
    expect(emitSpy).toHaveBeenCalledWith('postReactionChanged', {
      postId: '42',
      myReaction: 'love',
      likeCount: 5,
      topReactions: ['love', 'haha'],
    });
    expect(mockSetReaction).toHaveBeenCalledWith('42', 'love');

    await act(async () => renderer.unmount());
  });

  it('publishes the original reaction again when the detail mutation fails', async () => {
    mockSetReaction.mockRejectedValue(new Error('network failed'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    let latest!: ReturnType<typeof usePostDetailViewModel>;

    function Probe() {
      latest = usePostDetailViewModel({ fallbackPost, postId: '42' });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    await act(async () => {
      await latest.toggleReaction('love');
    });

    expect(latest.post).toMatchObject({
      myReaction: null,
      isLiked: false,
      likeCount: 4,
      topReactions: ['haha'],
    });
    expect(emitSpy).toHaveBeenLastCalledWith('postReactionChanged', {
      postId: '42',
      myReaction: null,
      likeCount: 4,
      topReactions: ['haha'],
    });

    await act(async () => renderer.unmount());
  });

  it('clears and publishes the reaction when the active reaction is tapped again', async () => {
    const reactedPost: FeedTextPost = {
      ...fallbackPost,
      likeCount: 5,
      isLiked: true,
      myReaction: 'love',
      topReactions: ['love', 'haha'],
      reactionBreakdown: { love: 1, haha: 4 },
    };
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    let latest!: ReturnType<typeof usePostDetailViewModel>;

    function Probe() {
      latest = usePostDetailViewModel({
        fallbackPost: reactedPost,
        postId: '42',
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    await act(async () => {
      await latest.toggleReaction('love');
    });

    expect(latest.post).toMatchObject({
      myReaction: null,
      isLiked: false,
      likeCount: 4,
      topReactions: ['haha'],
    });
    expect(mockSetReaction).toHaveBeenCalledWith('42', null);
    expect(emitSpy).toHaveBeenLastCalledWith('postReactionChanged', {
      postId: '42',
      myReaction: null,
      likeCount: 4,
      topReactions: ['haha'],
    });

    await act(async () => renderer.unmount());
  });
});
