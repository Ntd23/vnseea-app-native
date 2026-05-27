// Description: Poll API repository - creates poll posts and votes via WoWonder API.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { PollRepository } from '../../domain/repositories/PollRepository';
import type { PollOption, PollVoteResponse } from '../../domain/types/poll.types';

type CreatePollResponse = {
  api_status: number;
  post_id?: string;
  html?: string;
};

type VoteResponse = {
  api_status: number;
  votes?: RawPollOption[];
};

type RawPollOption = {
  id: string;
  text: string;
  option_votes: number;
  percentage: string;
  percentage_num: number;
  all: number;
};

function mapOption(raw: RawPollOption): PollOption {
  return {
    id: String(raw.id ?? ''),
    text: String(raw.text ?? ''),
    optionVotes: Number(raw.option_votes ?? 0),
    percentage: String(raw.percentage ?? '0%'),
    percentageNum: Number(raw.percentage_num ?? 0),
    all: Number(raw.all ?? 0),
  };
}

export function createPollRepository(): PollRepository {
  return {
    async createPollPost(postText: string, options: string[]): Promise<{ postId: string }> {
      const answerParams: Record<string, string> = {};
      options.forEach((opt, idx) => {
        answerParams[`answer[${idx}]`] = opt;
      });

      const response = await apiBridge.post<CreatePollResponse>(
        apiRoutes.feed.newPost,
        { postText, ...answerParams },
      );

      if (response.api_status !== 200) {
        throw new Error('Failed to create poll post');
      }

      return { postId: String(response.post_id ?? '') };
    },

    async votePoll(optionId: string): Promise<PollVoteResponse> {
      const response = await apiBridge.post<VoteResponse>(
        apiRoutes.poll.vote,
        { id: optionId },
      );

      if (response.api_status !== 200) {
        throw new Error('Failed to vote on poll');
      }

      return { options: (response.votes ?? []).map(mapOption) };
    },
  };
}
