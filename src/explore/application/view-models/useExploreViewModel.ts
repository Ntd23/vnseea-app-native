// Description: Coordinates the Explore / Hashtags screen state with the explore repository.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createExploreRepository } from '../../infrastructure/repositories/ApiExploreRepository';
import type { TrendingHashtag } from '../../domain/types/explore.types';

const repository = createExploreRepository();

/** Top-level filter chip on the Explore screen. */
export type ExploreTab = 'all' | 'hot' | 'new';

const TABS: ReadonlyArray<{ id: ExploreTab; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'hot', label: 'Đang hot' },
  { id: 'new', label: 'Mới' },
];

/** Public list of tabs the screen renders as a row of chips. */
export const EXPLORE_TABS = TABS;

/**
 * Map `last_trend_time` (a free-form string from PHP, often empty) onto a
 * number we can sort by. Anything missing or unparseable is treated as
 * `-Infinity` so it sinks to the bottom under the "new" tab.
 */
function trendTimeValue(item: TrendingHashtag): number {
  if (!item.lastTrendTime) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(item.lastTrendTime);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/**
 * Pure sort helper. Kept outside the hook so a future unit test can
 * import it without rendering React.
 */
export function sortByTab(
  items: TrendingHashtag[],
  tab: ExploreTab,
): TrendingHashtag[] {
  if (tab === 'all') return items;

  if (tab === 'hot') {
    // Tie-break by tag ASC for stable order when two items share a count.
    return [...items].sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return a.tag.localeCompare(b.tag);
    });
  }

  // tab === 'new' — sort by last_trend_time desc. If the backend never
  // populated any timestamps (common on fresh installs), every item has
  // value -Infinity → the comparator keeps original order (stable sort).
  return [...items].sort((a, b) => trendTimeValue(b) - trendTimeValue(a));
}

export function useExploreViewModel() {
  const [tags, setTags] = useState<TrendingHashtag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ExploreTab>('all');

  /**
   * Load trending hashtags. Pass `refresh: true` to skip the first-load
   * skeleton (use for pull-to-refresh); pass `refresh: false` (default)
   * for the initial mount when we DO want the skeleton.
   */
  const load = useCallback(async (refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const page = await repository.getTrendingHashtags({ limit: 20 });
      setTags(page.items);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Không thể tải hashtag. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Re-sort whenever the underlying data or the active tab changes.
  const visibleTags = useMemo(
    () => sortByTab(tags, activeTab),
    [tags, activeTab],
  );

  // Pre-computed stats the StatPill row consumes. Memoized so the pills
  // don't recompute on every tab change when the source data is stable.
  const stats = useMemo(() => {
    const totalPosts = tags.reduce((sum, item) => sum + item.useCount, 0);
    return {
      totalPosts,
      totalHashtags: tags.length,
    };
  }, [tags]);

  return {
    tags: visibleTags,
    rawTags: tags,
    isLoading,
    isRefreshing,
    error,
    activeTab,
    setActiveTab,
    reload: () => load(true),
    stats,
  };
}
