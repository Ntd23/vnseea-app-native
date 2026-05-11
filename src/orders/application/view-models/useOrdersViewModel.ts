// Orders - useOrdersViewModel ViewModel
// Port từ: client/src/orders/application/view-models/

import { useState, useCallback } from 'react';
import { createOrdersRepository } from '../../infrastructure/repositories/ApiOrdersRepository';

const repository = createOrdersRepository();

export function useOrdersViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
