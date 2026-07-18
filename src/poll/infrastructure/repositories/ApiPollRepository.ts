// Description: Poll API repository - creates poll posts and votes via WoWonder API.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { mapFeedPost } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type { PollRepository } from '../../domain/repositories/PollRepository';
import type {
  PollOption,
  PollVoter,
  PollVotersResponse,
  PollVoteResponse,
} from '../../domain/types/poll.types';

type CreatePollResponse = {
  api_status: number | string;
  post_id?: string | number;
  post_data?: Record<string, unknown>;
  code?: string;
  message?: string;
  error_text?: string;
  errors?: Array<{ error_text?: string }> | { error_text?: string };
  html?: string;
};

type VoteResponse = {
  api_status: number | string;
  votes?: RawPollOption[];
};

type VotersResponse = {
  api_status: number | string;
  voters?: RawPollVoter[];
};

type RawPollOption = {
  id: string;
  text: string;
  option_votes: number;
  percentage: string;
  percentage_num: number;
  all: number;
};

type RawPollVoter = {
  user_id?: string | number;
  name?: string;
  username?: string;
  avatar?: string;
  avatar_org?: string;
  option_id?: string | number;
  option_text?: string;
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

function mapVoter(raw: RawPollVoter): PollVoter {
  return {
    userId: String(raw.user_id ?? ''),
    name: String(raw.name ?? ''),
    username: String(raw.username ?? ''),
    avatarUrl: String(raw.avatar ?? raw.avatar_org ?? ''),
    optionId: String(raw.option_id ?? ''),
    optionText: String(raw.option_text ?? ''),
  };
}

export function createPollRepository(): PollRepository {
  return {
    async createPollPost(postText: string, options: string[]) {
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
        const response = await apiBridge.post<CreatePollResponse>(
          apiRoutes.feed.newPost,
          { postText, ...answerParams },
        );

        console.log(
          '[ApiPollRepository] Response:',
          JSON.stringify(response, null, 2),
        );

        // Handle both string "200" and number 200 api_status
        const apiStatus = response?.api_status;
        const isSuccess = String(apiStatus) === '200';

        if (!isSuccess) {
          // Get error message from response
          const responseError = Array.isArray(response?.errors)
            ? response.errors[0]?.error_text
            : response?.errors?.error_text;
          const errorMsg =
            responseError ||
            response?.error_text ||
            response?.message ||
            `Lỗi tạo cuộc thăm dò (mã: ${apiStatus})`;
          console.log('[ApiPollRepository] Error:', errorMsg);
          throw new Error(errorMsg);
        }

        // Check if post is under review
        if (response?.code === 'review') {
          console.log('[ApiPollRepository] Post is under review');
          return { postId: '', underReview: true };
        }

        if (!response.post_data) {
          throw new Error(
            'Mất dữ liệu cuộc thăm dò vừa tạo. Vui lòng thử lại.',
          );
        }

        const mappedPost = mapFeedPost(response.post_data);
        if (mappedPost.kind !== 'poll') {
          throw new Error('Mục vừa tạo chưa được nhận diện là cuộc thăm dò.');
        }

        const responsePostId =
          response.post_id ||
          response.post_data.post_id ||
          response.post_data.id;
        const postId = mappedPost.id || String(responsePostId ?? '');
        if (!postId) {
          throw new Error('Không nhận được mã cuộc thăm dò vừa tạo.');
        }
        const post =
          mappedPost.id === postId ? mappedPost : { ...mappedPost, id: postId };
        console.log('[ApiPollRepository] Created post ID:', postId);

        return { postId, post, underReview: false };
      } catch (err: any) {
        console.log('[ApiPollRepository] Catch error:', err?.message);
        console.log('[ApiPollRepository] Response data:', err?.response?.data);
        throw err;
      }
    },

    async votePoll(optionId: string): Promise<PollVoteResponse> {
      const response = await apiBridge.post<VoteResponse>(apiRoutes.poll.vote, {
        id: optionId,
      });

      if (String(response.api_status) !== '200') {
        throw new Error('Failed to vote on poll');
      }

      return { options: (response.votes ?? []).map(mapOption) };
    },

    async getPollVoters(postId: string): Promise<PollVotersResponse> {
      const response = await apiBridge.post<VotersResponse>(
        apiRoutes.poll.vote,
        { type: 'voters', post_id: postId },
      );

      if (String(response.api_status) !== '200') {
        throw new Error('Failed to load poll voters');
      }

      return { voters: (response.voters ?? []).map(mapVoter) };
    },
  };
}
