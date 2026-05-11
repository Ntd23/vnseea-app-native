// Popular - usePopularViewModel ViewModel
// Port từ: client/src/popular/application/view-models/

import { useState, useCallback } from 'react';
import { createPopularRepository } from '../../infrastructure/repositories/ApiPopularRepository';

const repository = createPopularRepository();

export function usePopularViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
