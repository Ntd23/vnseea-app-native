// Live - useLiveViewModel ViewModel
// Port từ: client/src/live/application/view-models/

import { useState, useCallback } from 'react';
import { createLiveRepository } from '../../infrastructure/repositories/ApiLiveRepository';

const repository = createLiveRepository();

export function useLiveViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
