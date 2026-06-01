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

      console.log('[ApiPollRepository] Creating poll with:', {
        postText,
        options,
        answerParams,
      });

      try {
        const response = await apiBridge.post<any>(
          apiRoutes.feed.newPost,
          { postText, ...answerParams },
        );

        console.log('[ApiPollRepository] Response:', JSON.stringify(response, null, 2));

        // Handle both string "200" and number 200 api_status
        const apiStatus = response?.api_status;
        const isSuccess = apiStatus == 200 || apiStatus === '200';

        if (!isSuccess) {
          // Get error message from response
          const errorMsg = response?.errors?.[0]?.error_text
            || response?.error_text
            || response?.message
            || `Lỗi tạo cuộc thăm dò (mã: ${apiStatus})`;
          console.log('[ApiPollRepository] Error:', errorMsg);
          throw new Error(errorMsg);
        }

        // Check if post is under review
        if (response?.code === 'review') {
          console.log('[ApiPollRepository] Post is under review');
        }

        // Return post ID from response
        const postId = response?.post_id
          || response?.post_data?.post_id
          || response?.post_data?.id;
        console.log('[ApiPollRepository] Created post ID:', postId);

        return { postId: String(postId ?? '') };
      } catch (err: any) {
        console.log('[ApiPollRepository] Catch error:', err?.message);
        console.log('[ApiPollRepository] Response data:', err?.response?.data);
        throw err;
      }
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
