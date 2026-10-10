// Description: Loads the Pages a user answers for and the customer conversations in the selected Page Inbox.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type {
  PageInboxConversation,
  PageInboxPage,
} from '../../domain/types/messages.types';

const repository = createMessagesRepository();
const PAGE_SIZE = 20;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function usePageInboxViewModel(initialPageId?: string) {
  const [pages, setPages] = useState<PageInboxPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState(initialPageId || '');
  const [conversations, setConversations] = useState<PageInboxConversation[]>([]);
  const [nextCursor, setNextCursor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignores responses for a Page or search the user has already left.
  const requestIdRef = useRef(0);

  const selectedPage = useMemo(
    () => pages.find(page => page.pageId === selectedPageId),
    [pages, selectedPageId],
  );

  const loadPages = useCallback(async () => {
    setIsLoadingPages(true);
    try {
      const nextPages = await repository.getPageInboxPages();
      setPages(nextPages);
      setSelectedPageId(current =>
        current && nextPages.some(page => page.pageId === current)
          ? current
          : nextPages[0]?.pageId || current,
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách trang.'));
    } finally {
      setIsLoadingPages(false);
    }
  }, []);

  const loadConversations = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!selectedPageId) return;
      const requestId = ++requestIdRef.current;
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      try {
        const result = await repository.getPageInboxConversations(selectedPageId, {
          limit: PAGE_SIZE,
          search: searchQuery,
        });
        if (requestId !== requestIdRef.current) return;
        setConversations(result.conversations);
        setNextCursor(result.nextCursor);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (mode !== 'silent') {
          setError(errorMessage(err, 'Không tải được hộp thư trang.'));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [searchQuery, selectedPageId],
  );

  const loadMore = useCallback(async () => {
    if (!selectedPageId || !nextCursor || isLoadingMore || isLoading) return;
    const requestId = requestIdRef.current;
    setIsLoadingMore(true);
    try {
      const result = await repository.getPageInboxConversations(selectedPageId, {
        limit: PAGE_SIZE,
        search: searchQuery,
        before: nextCursor,
      });
      if (requestId !== requestIdRef.current) return;
      setConversations(current => {
        const seen = new Set(current.map(item => item.customer.id));
        return [
          ...current,
          ...result.conversations.filter(item => !seen.has(item.customer.id)),
        ];
      });
      setNextCursor(result.nextCursor);
    } catch {
      // Keep the rows already shown; the next scroll retries.
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, nextCursor, searchQuery, selectedPageId]);

  useEffect(() => {
    loadPages().catch(() => undefined);
  }, [loadPages]);

  useEffect(() => {
    setConversations([]);
    setNextCursor('');
    loadConversations('initial').catch(() => undefined);
  }, [loadConversations]);

  const refresh = useCallback(() => {
    loadPages().catch(() => undefined);
    loadConversations('refresh').catch(() => undefined);
  }, [loadConversations, loadPages]);

  /** Re-reads the list without spinners, e.g. when the screen regains focus. */
  const refreshSilently = useCallback(() => {
    loadConversations('silent').catch(() => undefined);
  }, [loadConversations]);

  return {
    pages,
    selectedPage,
    selectedPageId,
    selectPage: setSelectedPageId,
    conversations,
    searchQuery,
    setSearchQuery,
    hasMore: Boolean(nextCursor),
    isLoadingPages,
    isLoading: isLoading || (isLoadingPages && conversations.length === 0),
    isRefreshing,
    isLoadingMore,
    error,
    refresh,
    refreshSilently,
    loadMore,
  };
}
