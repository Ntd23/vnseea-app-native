import type { FeedPost } from '../../../domain/types/feed.types';
import {
  applyFeedPostCaptionEdit,
  getFeedPostCaption,
  isFeedPostCaptionEditable,
} from '../postCaptionEdit';

const videoPost = {
  kind: 'video',
  id: '42',
  caption: 'Cũ',
  mentionNames: ['Tên cũ'],
  videoUrl: 'https://example.com/video.mp4',
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  myReaction: null,
  topReactions: [],
  privacy: 'public',
  publisher: { id: '1', name: 'A', username: 'a' },
} as FeedPost;

describe('postCaptionEdit', () => {
  it('edits text and video captions without changing the media payload', () => {
    expect(isFeedPostCaptionEditable(videoPost)).toBe(true);
    expect(getFeedPostCaption(videoPost)).toBe('Cũ');
    expect(applyFeedPostCaptionEdit(videoPost, 'Mới')).toEqual({
      ...videoPost,
      caption: 'Mới',
      mentionNames: undefined,
    });
  });

  it('does not mutate non-caption commerce posts', () => {
    const productPost = {
      kind: 'product',
      id: 'p1',
      product: {},
      publisher: { id: '1', name: 'A', username: 'a' },
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      myReaction: null,
      topReactions: [],
    } as unknown as FeedPost;

    expect(isFeedPostCaptionEditable(productPost)).toBe(false);
    expect(applyFeedPostCaptionEdit(productPost, 'Mới')).toBe(productPost);
  });
});
