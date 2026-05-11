// Blogs - useBlogsViewModel ViewModel
// Port từ: client/src/blogs/application/view-models/

import { useState, useCallback } from 'react';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';

const repository = createBlogsRepository();

export function useBlogsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
