// Poke - usePokeViewModel ViewModel
// Port từ: client/src/poke/application/view-models/

import { useState, useCallback } from 'react';
import { createPokeRepository } from '../../infrastructure/repositories/ApiPokeRepository';

const repository = createPokeRepository();

export function usePokeViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
