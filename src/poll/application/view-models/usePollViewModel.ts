// Description: Manages poll creation state and API calls.
import { useCallback, useState } from 'react';
import { createPollRepository } from '../../infrastructure/repositories/ApiPollRepository';

const repository = createPollRepository();

export function usePollViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPoll = useCallback(
    async (question: string, options: string[]): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await repository.createPollPost(question, options);
        return result.postId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể tạo cuộc thăm dò';
        setError(message);
        throw err; // Re-throw so screen can handle
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const votePoll = useCallback(async (optionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      return await repository.votePoll(optionId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể bình chọn';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createPoll,
    votePoll,
    clearError: () => setError(null),
  };
}