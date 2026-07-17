// Description: Poll repository interface for WoWonder API.

import type { PollVotersResponse, PollVoteResponse } from '../types/poll.types';
import type { FeedPollPost } from '../../../feed/domain/types/feed.types';

export type CreatePollPostResult = {
  postId: string;
  post?: FeedPollPost;
  underReview: boolean;
};

export interface PollRepository {
  // Create a post with poll
  createPollPost(
    postText: string,
    options: string[],
  ): Promise<CreatePollPostResult>;

  // Vote on a poll option
  votePoll(optionId: string): Promise<PollVoteResponse>;

  // Read the people and options for a poll
  getPollVoters(postId: string): Promise<PollVotersResponse>;
}
