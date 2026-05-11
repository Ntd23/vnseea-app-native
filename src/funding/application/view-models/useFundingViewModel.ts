// Funding - useFundingViewModel ViewModel
// Port từ: client/src/funding/application/view-models/

import { useState, useCallback } from 'react';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';

const repository = createFundingRepository();

export function useFundingViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
