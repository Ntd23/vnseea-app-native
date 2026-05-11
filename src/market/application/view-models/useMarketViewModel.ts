// Market - useMarketViewModel ViewModel
// Port từ: client/src/market/application/view-models/

import { useState, useCallback } from 'react';
import { createMarketRepository } from '../../infrastructure/repositories/ApiMarketRepository';

const repository = createMarketRepository();

export function useMarketViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
