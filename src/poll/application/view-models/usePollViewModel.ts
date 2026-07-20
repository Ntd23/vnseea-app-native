// Description: Manages poll creation state and API calls.
import { useCallback, useState } from 'react';
import type { CreatePollPostResult } from '../../domain/repositories/PollRepository';
import { createPollRepository } from '../../infrastructure/repositories/ApiPollRepository';

const repository = createPollRepository();

export interface UsePollViewModelOptions {
  createErrorFallback: string;
  voteErrorFallback: string;
}

const DEFAULT_OPTIONS: UsePollViewModelOptions = {
  createErrorFallback: 'Không thể tạo cuộc thăm dò',
  voteErrorFallback: 'Không thể bình chọn',
};

export function usePollViewModel(
  options: UsePollViewModelOptions = DEFAULT_OPTIONS,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPoll = useCallback(
    async (
      question: string,
      pollOptions: string[],
    ): Promise<CreatePollPostResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await repository.createPollPost(question, pollOptions);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : options.createErrorFallback;
        setError(message);
        throw err; // Re-throw so screen can handle
      } finally {
        setIsLoading(false);
      }
    },
    [options.createErrorFallback],
  );

  const votePoll = useCallback(
    async (optionId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        return await repository.votePoll(optionId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : options.voteErrorFallback;
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options.voteErrorFallback],
  );

  return {
    isLoading,
    error,
    createPoll,
    votePoll,
    clearError: () => setError(null),
  };
}
