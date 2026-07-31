import type { FeedPost } from '../../../domain/types/feed.types';
import { canAppendFeedPageWithoutResort } from '../feedPageOrdering';

function post(id: string, postedAt: number): FeedPost {
  return {
    kind: 'text',
    id,
    caption: id,
    photos: [],
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    privacy: 'public',
    permissions: { canDelete: false, canShare: true },
    publisher: { id: 'author', name: 'Author', username: 'author' },
    postedAt,
  };
}

describe('feed page ordering', () => {
  it('uses the direct append path for a strictly older cursor page', () => {
    expect(
      canAppendFeedPageWithoutResort(
        [post('3000', 3000), post('2971', 2971)],
        [post('2960', 2960), post('2950', 2950)],
      ),
    ).toBe(true);
  });

  it('requires a chronological merge when a legacy tail is older than the next recommended page', () => {
    expect(
      canAppendFeedPageWithoutResort(
        [post('3000', 3000), post('2100', 2100)],
        [post('2960', 2960)],
      ),
    ).toBe(false);
  });
});
