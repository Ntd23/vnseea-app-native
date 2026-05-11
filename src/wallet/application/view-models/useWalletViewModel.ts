// Wallet - useWalletViewModel ViewModel
// Port từ: client/src/wallet/application/view-models/

import { useState, useCallback } from 'react';
import { createWalletRepository } from '../../infrastructure/repositories/ApiWalletRepository';

const repository = createWalletRepository();

export function useWalletViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
