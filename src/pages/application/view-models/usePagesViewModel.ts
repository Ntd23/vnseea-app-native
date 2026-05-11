// Pages - usePagesViewModel ViewModel
// Port từ: client/src/pages/application/view-models/

import { useState, useCallback } from 'react';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';

const repository = createPagesRepository();

export function usePagesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
