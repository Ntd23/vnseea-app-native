// Popular ViewModel - connected to real most_liked API

import { useState, useCallback, useEffect } from 'react';
import { createPopularRepository } from '../../infrastructure/repositories/ApiPopularRepository';
import type { FeedPost } from '../../../feed/domain/types/feed.types';

const repository = createPopularRepository();

export function usePopularViewModel() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
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

  const updatePost = useCallback(
    (postId: string, update: (post: FeedPost) => FeedPost) => {
      setPosts(current =>
        current.map(post => (post.id === postId ? update(post) : post)),
      );
    },
    [],
  );

  const removePost = useCallback((postId: string) => {
    setPosts(current => current.filter(post => post.id !== postId));
  }, []);

  return {
    posts,
    isLoading,
    error,
    reload: loadMostLiked,
    updatePost,
    removePost,
  };
}
