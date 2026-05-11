// Community - useCommunityViewModel ViewModel
// Port từ: client/src/community/application/view-models/

import { useState, useCallback } from 'react';
import { createCommunityRepository } from '../../infrastructure/repositories/ApiCommunityRepository';

const repository = createCommunityRepository();

export function useCommunityViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
