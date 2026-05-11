// Feed - useFeedViewModel ViewModel
// Port từ: client/src/feed/application/view-models/

import { useState, useCallback } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';

const repository = createFeedRepository();

export function useFeedViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
