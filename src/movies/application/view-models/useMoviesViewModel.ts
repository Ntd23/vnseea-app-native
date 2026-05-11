// Movies - useMoviesViewModel ViewModel
// Port từ: client/src/movies/application/view-models/

import { useState, useCallback } from 'react';
import { createMoviesRepository } from '../../infrastructure/repositories/ApiMoviesRepository';

const repository = createMoviesRepository();

export function useMoviesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
