// Jobs - useJobsViewModel ViewModel
// Port từ: client/src/jobs/application/view-models/

import { useState, useCallback } from 'react';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';

const repository = createJobsRepository();

export function useJobsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
