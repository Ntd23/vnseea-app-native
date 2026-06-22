// Description: ViewModel for the PostReactions screen.
//
// Mirrors the tab + offset-pagination pattern of `useFollowingViewModel`:
// the screen never holds data-loading or pagination state directly;
// instead it consumes this hook and renders the returned slice.
//
// One nuance vs. the following screen: each tab carries its OWN slice
// (users, offset, hasMore) so switching back to a previously-viewed
// tab doesn't lose its scroll position or trigger a refetch.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type { PostReactionUser } from '../../domain/types/reactions.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { PostReactionTab } from '../i18n/feedCopy';

const PAGE_SIZE = 20;

interface TabState {
  users: PostReactionUser[];
  offset: number;
  reachedEnd: boolean;
  isLoadingMore: boolean;
}

const EMPTY_TAB: TabState = {
  users: [],
  offset: 0,
  reachedEnd: false,
  isLoadingMore: false,
};

type TabMap = Record<PostReactionTab, TabState>;

function createEmptyTabMap(): TabMap {
  return {
    all: { ...EMPTY_TAB },
    like: { ...EMPTY_TAB },
    love: { ...EMPTY_TAB },
    haha: { ...EMPTY_TAB },
    wow: { ...EMPTY_TAB },
    sad: { ...EMPTY_TAB },
    angry: { ...EMPTY_TAB },
  };
}

export function usePostReactionsViewModel(postId: string) {
  const repository = useMemo(() => createFeedRepository(), []);

  const [activeTab, setActiveTab] = useState<PostReactionTab>('all');
  const [tabState, setTabState] = useState<TabMap>(createEmptyTabMap);
  /**
   * Per-type totals for the current post — derived from the first
   * `getPostReactions()` response (which always returns the full
   * `reactions` array regardless of the slice we asked for). Used to
   * badge each tab with a count and to compute the header total.
   */
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against late responses overwriting newer state when the user
  // rapidly switches tabs. The ref tracks the latest tab the caller
  // asked us to load — any in-flight fetch that resolves against an
  // older tab is dropped silently.
  const latestRequestRef = useRef(0);

  const loadTab = useCallback(
    async (tab: PostReactionTab, refreshing: boolean) => {
      const requestId = ++latestRequestRef.current;
      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const reaction: ReactionType | undefined =
          tab === 'all' ? undefined : tab;
        const result = await repository.getPostReactions(
          postId,
          reaction,
          PAGE_SIZE,
          0,
        );

        if (latestRequestRef.current !== requestId) return;

        setCounts(prev => {
          // The `'all'` fetch is the authoritative source of per-type
          // totals — server returns them regardless of slice. When the
          // user switches to a specific tab, the response contains
          // counts for that single type only, so we merge rather than
          // overwrite.
          if (tab === 'all') {
            const next = { ...prev };
            for (const c of result.reactions) {
              next[c.reaction] = c.count;
            }
            return next;
          }
          const next = { ...prev };
          for (const c of result.reactions) {
            next[c.reaction] = c.count;
          }
          return next;
        });

        setTabState(prev => ({
          ...prev,
          [tab]: {
            users: result.users,
            offset: result.users.length,
            reachedEnd: result.reachedEnd,
            isLoadingMore: false,
          },
        }));
      } catch (caught) {
        if (latestRequestRef.current !== requestId) return;
        setTabState(prev => ({
          ...prev,
          [tab]: { ...EMPTY_TAB },
        }));
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không tải được danh sách cảm xúc.',
        );
      } finally {
        if (latestRequestRef.current !== requestId) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [postId, repository],
  );

  // Initial load: fetch the 'all' tab once so we get both the merged
  // user list AND the per-type counts to badge every tab.
  useEffect(() => {
    loadTab('all', false);
  }, [loadTab]);

  const switchTab = useCallback(
    (tab: PostReactionTab) => {
      setActiveTab(tab);
      // If this tab has never been loaded, kick off the request. The
      // empty user list means we haven't fetched it yet — fall through
      // to loadTab. We do NOT auto-refresh tabs that already have
      // cached data so switching back and forth feels instant.
      setTabState(prev => {
        if (prev[tab].users.length === 0 && !prev[tab].reachedEnd) {
          // Schedule the fetch on the next tick so we don't update
          // tabState and trigger loadTab mid-render.
          setTimeout(() => loadTab(tab, false), 0);
        }
        return prev;
      });
    },
    [loadTab],
  );

  const refresh = useCallback(() => {
    setTabState(createEmptyTabMap());
    loadTab(activeTab, true);
  }, [activeTab, loadTab]);

  const loadMore = useCallback(async () => {
    const current = tabState[activeTab];
    if (
      current.reachedEnd ||
      current.isLoadingMore ||
      current.users.length === 0
    ) {
      return;
    }

    const requestId = latestRequestRef.current;
    setTabState(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], isLoadingMore: true },
    }));

    try {
      const reaction: ReactionType | undefined =
        activeTab === 'all' ? undefined : activeTab;
      const result = await repository.getPostReactions(
        postId,
        reaction,
        PAGE_SIZE,
        current.offset,
      );
      if (latestRequestRef.current !== requestId) return;

      setTabState(prev => {
        const existing = prev[activeTab].users;
        // De-dupe by user id — backend occasionally returns overlap on
        // offset boundaries.
        const seen = new Set(existing.map(u => u.id));
        const fresh = result.users.filter(u => !seen.has(u.id));
        return {
          ...prev,
          [activeTab]: {
            users: [...existing, ...fresh],
            offset: prev[activeTab].offset + result.users.length,
            reachedEnd: result.reachedEnd,
            isLoadingMore: false,
          },
        };
      });
    } catch (caught) {
      if (latestRequestRef.current !== requestId) return;
      setTabState(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], isLoadingMore: false },
      }));
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được danh sách cảm xúc.',
      );
    }
  }, [activeTab, postId, repository, tabState]);

  const retry = useCallback(() => {
    setTabState(createEmptyTabMap());
    void loadTab(activeTab, false);
  }, [activeTab, loadTab]);

  const current = tabState[activeTab];
  const totalCount = Object.values(counts).reduce<number>(
    (sum, n) => sum + (n ?? 0),
    0,
  );

  return {
    activeTab,
    switchTab,
    users: current.users,
    counts,
    totalCount,
    isLoading,
    isRefreshing,
    isLoadingMore: current.isLoadingMore,
    hasMore: !current.reachedEnd && current.users.length > 0,
    error,
    refresh,
    loadMore,
    retry,
  };
}