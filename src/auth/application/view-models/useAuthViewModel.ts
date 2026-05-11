// Auth - useAuthViewModel ViewModel
// Port từ: client/src/auth/application/view-models/

import { useState, useCallback } from 'react';
import { createAuthRepository } from '../../infrastructure/repositories/ApiAuthRepository';

const repository = createAuthRepository();

export function useAuthViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
