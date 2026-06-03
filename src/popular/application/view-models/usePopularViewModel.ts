// Popular ViewModel - connected to real most_liked API

import { useState, useCallback, useEffect } from 'react';
import { createPopularRepository } from '../../infrastructure/repositories/ApiPopularRepository';
import type { PopularPost } from '../../domain/types/popular.types';

const repository = createPopularRepository();

export function usePopularViewModel() {
  const [posts, setPosts] = useState<PopularPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMostLiked = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await repository.getMostLiked();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMostLiked();
  }, [loadMostLiked]);

  return {
    posts,
    isLoading,
    error,
    reload: loadMostLiked,
  };
}
