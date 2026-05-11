// Games - useGamesViewModel ViewModel
// Port từ: client/src/games/application/view-models/

import { useState, useCallback } from 'react';
import { createGamesRepository } from '../../infrastructure/repositories/ApiGamesRepository';

const repository = createGamesRepository();

export function useGamesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
