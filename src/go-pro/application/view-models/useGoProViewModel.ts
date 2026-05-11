// GoPro - useGoProViewModel ViewModel
// Port từ: client/src/go-pro/application/view-models/

import { useState, useCallback } from 'react';
import { createGoProRepository } from '../../infrastructure/repositories/ApiGoProRepository';

const repository = createGoProRepository();

export function useGoProViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
