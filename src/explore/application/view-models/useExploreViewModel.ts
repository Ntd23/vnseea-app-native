// Explore - useExploreViewModel ViewModel
// Port từ: client/src/explore/application/view-models/

import { useState, useCallback } from 'react';
import { createExploreRepository } from '../../infrastructure/repositories/ApiExploreRepository';

const repository = createExploreRepository();

export function useExploreViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
