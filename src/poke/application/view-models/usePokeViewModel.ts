// Poke - usePokeViewModel ViewModel
// Port từ: client/src/poke/application/view-models/

import { useState, useCallback } from 'react';
import type { PokeItem, PokeListOptions } from '../../domain/types/poke.types';
import { createPokeRepository } from '../../infrastructure/repositories/ApiPokeRepository';

const repository = createPokeRepository();

export function usePokeViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pokes, setPokes] = useState<PokeItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<string | null>(null);

  const loadPokes = useCallback(async (options?: PokeListOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getPokes(options);
      if (options?.offset) {
        setPokes(prev => [...prev, ...result.items]);
      } else {
        setPokes(result.items);
      }
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách poke');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextOffset || isLoading) return;
    await loadPokes({ offset: nextOffset });
  }, [hasMore, nextOffset, isLoading, loadPokes]);

  const createPoke = useCallback(async (userId: string | number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.createPoke({ userId });
      setPokes(prev => [result, ...prev]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể poke người dùng');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removePoke = useCallback(async (pokeId: string | number) => {
    setIsLoading(true);
    setError(null);
    try {
      await repository.removePoke(pokeId);
      setPokes(prev => prev.filter(poke => poke.id !== pokeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa poke');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setNextOffset(null);
    await loadPokes();
  }, [loadPokes]);

  return {
    pokes,
    isLoading,
    error,
    hasMore,
    loadPokes,
    loadMore,
    createPoke,
    removePoke,
    refresh,
  };
}
