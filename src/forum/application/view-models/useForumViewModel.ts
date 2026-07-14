// Description: Coordinates forum catalog, member, search, thread, and reply screen state.
// Port từ: client/src/forum/application/view-models/

import { useState, useCallback } from 'react';
import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMember,
  ForumMemberQuery,
  ForumMutationResult,
  ForumReply,
  ForumReplyPayload,
  ForumThread,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
  ForumSearchQuery,
  ForumSearchResult,
} from '../../domain/types/forum.types';
import { createForumRepository } from '../../infrastructure/repositories/ApiForumRepository';

const repository = createForumRepository();

export function useForumViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ForumCatalog | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [members, setMembers] = useState<ForumMember[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [searchResult, setSearchResult] = useState<ForumSearchResult | null>(null);
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

  const loadMembers = useCallback(async (query: ForumMemberQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getForumMembers(query);
      setMembers(query.offset ? current => [...current, ...result.members] : result.members);
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thành viên');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchForum = useCallback(async (query: ForumSearchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.searchForum(query);
      setSearchResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tìm kiếm diễn đàn');
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

  const loadMyMessages = useCallback(async (query: ForumCatalogQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getMyForumMessages(query);
      setReplies(result.replies);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bài trả lời của bạn');
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
    members,
    replies,
    searchResult,
    threadDetail,
    hasMore,
    nextOffset,
    loadCatalog,
    loadThreads,
    loadMembers,
    searchForum,
    loadMyThreads,
    loadMyMessages,
    loadThreadDetail,
    createThread,
    replyThread,
    loadMore,
    refresh,
  };
}
