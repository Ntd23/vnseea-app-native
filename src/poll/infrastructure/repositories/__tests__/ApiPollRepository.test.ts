jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

jest.mock(
  '../../../../feed/infrastructure/repositories/ApiFeedRepository',
  () => ({
    mapFeedPost: jest.fn(),
  }),
);

import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { mapFeedPost } from '../../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createPollRepository } from '../ApiPollRepository';

describe('ApiPollRepository createPollPost', () => {
  it('returns the mapped poll post so Home Feed can prepend it immediately', async () => {
    const mappedPoll = {
      kind: 'poll' as const,
      id: 'poll-101',
      pollQuestion: 'Bạn chọn phương án nào?',
      options: [],
      votedId: null,
      totalVotes: 0,
      postedAt: 1781712000,
      likeCount: 0,
      privacy: 'public' as const,
      commentCount: 0,
      isLiked: false,
      myReaction: null,
      topReactions: [],
      publisher: { id: 'viewer-1', name: 'Viewer', username: 'viewer' },
    };

    (apiBridge.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      post_data: { id: 'poll-101', poll_id: 1 },
    });
    (mapFeedPost as jest.Mock).mockReturnValueOnce(mappedPoll);

    const result = await createPollRepository().createPollPost(
      'Bạn chọn phương án nào?',
      ['Phương án 1', 'Phương án 2'],
    );

    expect(apiBridge.post).toHaveBeenCalledWith('new_post', {
      postText: 'Bạn chọn phương án nào?',
      'answer[0]': 'Phương án 1',
      'answer[1]': 'Phương án 2',
    });
    expect(result).toEqual({
      postId: 'poll-101',
      post: mappedPoll,
      underReview: false,
    });
  });

  it('loads voter names and the selected option for a poll post', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValueOnce({
      api_status: '200',
      voters: [
        {
          user_id: 7,
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          avatar: 'https://cdn.test/a.jpg',
          option_id: 2,
          option_text: 'Phương án 2',
        },
      ],
    });

    const result = await createPollRepository().getPollVoters('101');

    expect(apiBridge.post).toHaveBeenCalledWith('vote_up', {
      type: 'voters',
      post_id: '101',
    });
    expect(result).toEqual({
      voters: [
        {
          userId: '7',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          avatarUrl: 'https://cdn.test/a.jpg',
          optionId: '2',
          optionText: 'Phương án 2',
        },
      ],
    });
  });
});
