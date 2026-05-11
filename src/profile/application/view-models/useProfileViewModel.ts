// Profile - useProfileViewModel ViewModel
// Port từ: client/src/profile/application/view-models/

import { useState, useCallback } from 'react';
import { createProfileRepository } from '../../infrastructure/repositories/ApiProfileRepository';

const repository = createProfileRepository();

export function useProfileViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
