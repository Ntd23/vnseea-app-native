// Description: Handles job creation form logic and user pages loading.
import { useCallback, useEffect, useState } from 'react';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import type { CreateJobPayload, JobsItem } from '../../domain/types/jobs.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';

const repository = createJobsRepository();

interface MyPage {
  page_id: string | number;
  page_title: string;
  page_name: string;
  avatar: string;
  cover: string;
}

interface MyPagesResponse {
  api_status: number | string;
  data?: MyPage[];
  pages?: MyPage[];
}

export function useCreateJobViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myPages, setMyPages] = useState<MyPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);

  const clearError = useCallback(() => setError(null), []);

  const loadMyPages = useCallback(async () => {
    setIsLoadingPages(true);
    try {
      const response = await apiBridge.post<MyPagesResponse>(apiRoutes.pages.getMine, {
        type: 'my_pages',
      });
      if (response.api_status === 200 || response.api_status === '200') {
        // Backend returns data in either 'data' or 'pages' field
        const pagesList = response.data ?? response.pages ?? [];
        setMyPages(pagesList);
      }
    } catch (err) {
      console.error('[useCreateJobViewModel] loadMyPages error:', err);
    } finally {
      setIsLoadingPages(false);
    }
  }, []);

  useEffect(() => {
    loadMyPages();
  }, [loadMyPages]);

  const createJob = useCallback(async (payload: CreateJobPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.createJob(payload);
      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tạo việc làm. Vui lòng thử lại.';
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createJob,
    isLoading,
    error,
    clearError,
    myPages,
    isLoadingPages,
    refreshPages: loadMyPages,
  };
}