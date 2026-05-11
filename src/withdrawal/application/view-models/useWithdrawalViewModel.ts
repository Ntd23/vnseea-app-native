// Withdrawal - useWithdrawalViewModel ViewModel
// Port từ: client/src/withdrawal/application/view-models/

import { useState, useCallback } from 'react';
import { createWithdrawalRepository } from '../../infrastructure/repositories/ApiWithdrawalRepository';

const repository = createWithdrawalRepository();

export function useWithdrawalViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
