// Description: Loads a compact set of jobs for the home feed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import type { JobsItem } from '../../domain/types/jobs.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import {
  canLoadMoreJobFeed,
  mergeUniqueJobFeedItems,
} from './jobFeedPagination';

const repository = createJobsRepository();
const FEED_JOBS_LIMIT = 6;

type UseJobsOnFeedViewModelOptions = {
  autoLoad?: boolean;
};

export function useJobsOnFeedViewModel(
  options: UseJobsOnFeedViewModelOptions = {},
) {
  const { autoLoad = true } = options;
  const [jobs, setJobs] = useState<JobsItem[]>(() =>
    autoLoad ? feedCacheStorage.getCachedJobs() : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstPageLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const pagingGenerationRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);

  const reloadJobs = useCallback(async (isPullToRefresh = false) => {
    isFirstPageLoadingRef.current = true;
    const requestGeneration = ++pagingGenerationRef.current;
    loadMoreRequestIdRef.current += 1;
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setIsAllLoaded(false);
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
      if (requestGeneration !== pagingGenerationRef.current) return;
      setJobs(result);
      setIsAllLoaded(result.length < FEED_JOBS_LIMIT);
      feedCacheStorage.setCachedJobs(result);
    } catch (caught) {
      if (requestGeneration !== pagingGenerationRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được danh sách việc làm.',
      );
    } finally {
      if (requestGeneration === pagingGenerationRef.current) {
        isFirstPageLoadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const loadMoreJobs = useCallback(async () => {
    if (
      !canLoadMoreJobFeed({
        isFirstPageLoading: isFirstPageLoadingRef.current,
        isLoadingMore: isLoadingMoreRef.current,
        isAllLoaded,
        hasJobs: jobs.length > 0,
      })
    ) {
      return;
    }

    const lastJob = jobs[jobs.length - 1];
    if (!lastJob) return;

    isLoadingMoreRef.current = true;
    const requestGeneration = pagingGenerationRef.current;
    const requestId = ++loadMoreRequestIdRef.current;
    setIsLoadingMore(true);

    try {
      const numericOffset = Number(lastJob.id);
      const result = await repository.searchJobs({
        keyword: '',
        limit: FEED_JOBS_LIMIT,
        offset:
          Number.isFinite(numericOffset) && numericOffset > 0
            ? numericOffset
            : jobs.length,
      });
      if (requestGeneration !== pagingGenerationRef.current) return;

      const mergedJobs = mergeUniqueJobFeedItems(jobs, result);
      if (mergedJobs.length === jobs.length) {
        setIsAllLoaded(true);
        return;
      }

      setJobs(mergedJobs);
      setIsAllLoaded(result.length < FEED_JOBS_LIMIT);
      feedCacheStorage.setCachedJobs(mergedJobs);
    } catch (caught) {
      console.warn('[jobs] feed pagination failed:', caught);
    } finally {
      if (loadMoreRequestIdRef.current === requestId) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [isAllLoaded, jobs]);

  useEffect(() => {
    if (!autoLoad) return;
    reloadJobs();
  }, [autoLoad, reloadJobs]);

  useEffect(
    () => () => {
      pagingGenerationRef.current += 1;
      loadMoreRequestIdRef.current += 1;
      isFirstPageLoadingRef.current = false;
      isLoadingMoreRef.current = false;
    },
    [],
  );

  return {
    jobs,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    error,
    reloadJobs,
    loadMoreJobs,
  };
}
