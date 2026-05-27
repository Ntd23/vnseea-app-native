// Description: Poll repository interface for WoWonder API.

import type { PollOption, PollVoteResponse } from '../types/poll.types';

export interface PollRepository {
  // Create a post with poll
  createPollPost(
    postText: string,
    options: string[],
  ): Promise<{ postId: string }>;

  // Vote on a poll option
  votePoll(optionId: string): Promise<PollVoteResponse>;
}