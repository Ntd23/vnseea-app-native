// Description: Loads a compact set of jobs for the home feed.
import { useCallback, useEffect, useState } from 'react';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import type { JobsItem } from '../../domain/types/jobs.types';

const repository = createJobsRepository();
const FEED_JOBS_LIMIT = 6;

export function useJobsOnFeedViewModel() {
  const [jobs, setJobs] = useState<JobsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadJobs = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await repository.searchJobs({
        keyword: '',
        limit: FEED_JOBS_LIMIT,
        offset: 0,
      });
      setJobs(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được danh sách việc làm.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reloadJobs();
  }, [reloadJobs]);

  return {
    jobs,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    reloadJobs,
  };
}
