// Forum - useForumViewModel ViewModel
// Port từ: client/src/forum/application/view-models/

import { useState, useCallback } from 'react';
import { createForumRepository } from '../../infrastructure/repositories/ApiForumRepository';

const repository = createForumRepository();

export function useForumViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
