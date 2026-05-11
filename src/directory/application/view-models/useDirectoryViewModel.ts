// Directory - useDirectoryViewModel ViewModel
// Port từ: client/src/directory/application/view-models/

import { useState, useCallback } from 'react';
import { createDirectoryRepository } from '../../infrastructure/repositories/ApiDirectoryRepository';

const repository = createDirectoryRepository();

export function useDirectoryViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
