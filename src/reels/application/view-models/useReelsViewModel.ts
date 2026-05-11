// Reels - useReelsViewModel ViewModel
// Port từ: client/src/reels/application/view-models/

import { useState, useCallback } from 'react';
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';

const repository = createReelsRepository();

export function useReelsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
