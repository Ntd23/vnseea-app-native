// Photos - usePhotosViewModel ViewModel
// Port từ: client/src/photos/application/view-models/

import { useState, useCallback } from 'react';
import { createPhotosRepository } from '../../infrastructure/repositories/ApiPhotosRepository';

const repository = createPhotosRepository();

export function usePhotosViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
