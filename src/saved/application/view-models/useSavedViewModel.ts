// Saved - useSavedViewModel ViewModel
// Port từ: client/src/saved/application/view-models/

import { useState, useCallback } from 'react';
import { createSavedRepository } from '../../infrastructure/repositories/ApiSavedRepository';

const repository = createSavedRepository();

export function useSavedViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
