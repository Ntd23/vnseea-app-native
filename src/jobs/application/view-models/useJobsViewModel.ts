// Jobs ViewModel
// English description: Coordinates jobs screen state with the jobs repository.
import { useCallback, useEffect, useState } from 'react';
import type { JobsItem, JobType } from '../../domain/types/jobs.types';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import type { JobsSearchOptions } from '../../domain/repositories/JobsRepository';

const repository = createJobsRepository();

export function useJobsViewModel() {
  const [jobs, setJobs] = useState<JobsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadJobs = useCallback(async (options?: JobsSearchOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.searchJobs(options);
      setJobs(result);
      setHasMore(result.length >= (options?.limit ?? 20));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tải danh sách việc làm.',
      );
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || jobs.length === 0) return;

    setIsLoadingMore(true);
    try {
      const lastJob = jobs[jobs.length - 1];
      const offset = Number(lastJob.id);

      const result = await repository.searchJobs({
        keyword: '',
        limit: 20,
        offset: offset,
      });

      if (result.length > 0) {
        setJobs(prev => [...prev, ...result]);
        setHasMore(result.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (caughtError) {
      console.error('[useJobsViewModel] loadMore error:', caughtError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, jobs]);

  const searchJobs = useCallback(async (keyword: string, jobType?: JobType) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.searchJobs({
        keyword,
        jobType,
        limit: 20,
        offset: 0,
      });
      setJobs(result);
      setHasMore(result.length >= 20);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tìm kiếm việc làm.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadJobs,
    loadMore,
    searchJobs,
    refresh,
  };
}