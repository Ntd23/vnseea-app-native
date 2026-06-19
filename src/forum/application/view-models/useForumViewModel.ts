// Forum - useForumViewModel ViewModel
// Port từ: client/src/forum/application/view-models/

import { useState, useCallback } from 'react';
import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThread,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
} from '../../domain/types/forum.types';
import { createForumRepository } from '../../infrastructure/repositories/ApiForumRepository';

const repository = createForumRepository();

export function useForumViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ForumCatalog | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [threadDetail, setThreadDetail] = useState<ForumThreadDetail | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const loadCatalog = useCallback(async (query: ForumCatalogQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getForumCatalog(query);
      setCatalog(result);
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách diễn đàn');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadThreads = useCallback(async (query: ForumThreadQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getForumThreads(query);
      if (query.offset) {
        setThreads(prev => [...prev, ...result.threads]);
      } else {
        setThreads(result.threads);
      }
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chủ đề');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMyThreads = useCallback(async (query: ForumCatalogQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getMyForumThreads(query);
      if (query.offset) {
        setThreads(prev => [...prev, ...result.threads]);
      } else {
        setThreads(result.threads);
      }
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chủ đề của bạn');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadThreadDetail = useCallback(async (threadId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getForumThreadDetail(threadId);
      setThreadDetail(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết chủ đề');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createThread = useCallback(async (payload: ForumThreadPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.createThread(payload);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo chủ đề');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const replyThread = useCallback(async (payload: ForumReplyPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.replyThread(payload);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể trả lời chủ đề');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (currentQuery: ForumThreadQuery | ForumCatalogQuery) => {
    if (!hasMore || !nextOffset || isLoading) return;
    
    if ('forumId' in currentQuery) {
      await loadThreads({ ...currentQuery, offset: nextOffset });
    } else {
      await loadCatalog({ ...currentQuery, offset: nextOffset });
    }
  }, [hasMore, nextOffset, isLoading, loadThreads, loadCatalog]);

  const refresh = useCallback(() => {
    setNextOffset(null);
    setThreads([]);
  }, []);

  return {
    isLoading,
    error,
    catalog,
    threads,
    threadDetail,
    hasMore,
    nextOffset,
    loadCatalog,
    loadThreads,
    loadMyThreads,
    loadThreadDetail,
    createThread,
    replyThread,
    loadMore,
    refresh,
  };
}
