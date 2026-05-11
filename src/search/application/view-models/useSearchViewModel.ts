// Search - useSearchViewModel ViewModel
// Port từ: client/src/search/application/view-models/

import { useState, useCallback } from 'react';
import { createSearchRepository } from '../../infrastructure/repositories/ApiSearchRepository';

const repository = createSearchRepository();

export function useSearchViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
