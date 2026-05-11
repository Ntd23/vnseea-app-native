// Memories - useMemoriesViewModel ViewModel
// Port từ: client/src/memories/application/view-models/

import { useState, useCallback } from 'react';
import { createMemoriesRepository } from '../../infrastructure/repositories/ApiMemoriesRepository';

const repository = createMemoriesRepository();

export function useMemoriesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
