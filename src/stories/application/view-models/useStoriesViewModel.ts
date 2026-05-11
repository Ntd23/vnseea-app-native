// Stories - useStoriesViewModel ViewModel
// Port từ: client/src/stories/application/view-models/

import { useState, useCallback } from 'react';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';

const repository = createStoriesRepository();

export function useStoriesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
