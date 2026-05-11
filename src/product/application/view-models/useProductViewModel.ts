// Product - useProductViewModel ViewModel
// Port từ: client/src/product/application/view-models/

import { useState, useCallback } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';

const repository = createProductRepository();

export function useProductViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
