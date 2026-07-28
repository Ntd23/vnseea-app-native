const mockGetComments = jest.fn();

jest.mock(
  '../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: 'test-viewer' }),
    },
  }),
);

jest.mock(
  '../../../reels/infrastructure/repositories/ApiReelsRepository',
  () => ({
    createReelsRepository: () => ({
      getComments: (...args: unknown[]) => mockGetComments(...args),
    }),
  }),
);

import {
  loadFeedCommentsPage,
  readFeedCommentsCache,
} from '../feedCommentsCache';

describe('feedCommentsCache', () => {
  beforeEach(() => {
    mockGetComments.mockReset();
  });

  it('shares the first-page request between Feed and PostDetail', async () => {
    const comments = [
      {
        id: '11',
        text: 'Xin chào',
        postedAt: 1,
        publisher: {
          userId: '7',
          username: 'tester',
          name: 'Tester',
        },
        likeCount: 0,
        replyCount: 0,
        isLiked: false,
        myReaction: null,
        owner: false,
        postOwner: false,
      },
    ];
    mockGetComments.mockResolvedValue(comments);

    const [first, second] = await Promise.all([
      loadFeedCommentsPage('post-1'),
      loadFeedCommentsPage('post-1'),
    ]);

    expect(mockGetComments).toHaveBeenCalledTimes(1);
    expect(mockGetComments).toHaveBeenCalledWith('post-1', {
      limit: 20,
      offset: 0,
    });
    expect(first.comments).toEqual(comments);
    expect(second.comments).toEqual(comments);
    expect(readFeedCommentsCache('post-1')?.comments).toEqual(comments);
  });
});
