// Checkout - useCheckoutViewModel ViewModel
// Port từ: client/src/checkout/application/view-models/

import { useState, useCallback } from 'react';
import { createCheckoutRepository } from '../../infrastructure/repositories/ApiCheckoutRepository';

const repository = createCheckoutRepository();

export function useCheckoutViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
