// Description: Owns lazy, independently paginated Activity Center tabs.
import { useCallback, useMemo, useRef, useState } from 'react';
import { createActivityRepository } from '../../infrastructure/repositories/ApiActivityRepository';
import type { ActivityCenterTab } from '../../domain/types/activity.types';
import {
  appendActivityPage,
  createActivityCenterState,
  replaceActivityPage,
  type ActivityCenterState,
} from './activityCenterState';

const PAGE_SIZE = 20;
type LoadMode = 'initial' | 'refresh' | 'more';

export function useActivityCenterViewModel() {
  const repository = useMemo(() => createActivityRepository(), []);
  const [state, setState] = useState(createActivityCenterState);
  const stateRef = useRef<ActivityCenterState>(state);
  const generationRef = useRef<Record<ActivityCenterTab, number>>({
    saved: 0,
    reaction: 0,
    comment: 0,
    share: 0,
  });

  const updateState = useCallback(
    (updater: (current: ActivityCenterState) => ActivityCenterState) => {
      setState(current => {
        const next = updater(current);
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  const load = useCallback(
    async (category: ActivityCenterTab, mode: LoadMode) => {
      const current = stateRef.current[category];
      if (current.loading || current.refreshing || current.loadingMore) return;
      if (mode === 'more' && (!current.hasMore || !current.nextCursor)) return;

      const generation = generationRef.current[category] + 1;
      generationRef.current[category] = generation;
      updateState(previous => ({
        ...previous,
        [category]: {
          ...previous[category],
          loading: mode === 'initial',
          refreshing: mode === 'refresh',
          loadingMore: mode === 'more',
          error: null,
        },
      }));

      try {
        const page = await repository.getPostActivity({
          category,
          limit: PAGE_SIZE,
          cursor: mode === 'more' ? current.nextCursor : undefined,
        });
        if (generationRef.current[category] !== generation) return;
        updateState(previous =>
          mode === 'more'
            ? appendActivityPage(previous, category, page)
            : replaceActivityPage(previous, category, page),
        );
      } catch (error) {
        if (generationRef.current[category] !== generation) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Không tải được hoạt động của bạn.';
        updateState(previous => ({
          ...previous,
          [category]: {
            ...previous[category],
            loaded: previous[category].loaded || mode === 'refresh',
            loading: false,
            refreshing: false,
            loadingMore: false,
            error: message,
          },
        }));
      }
    },
    [repository, updateState],
  );

  const ensureLoaded = useCallback(
    (category: ActivityCenterTab) => {
      const current = stateRef.current[category];
      if (!current.loaded && !current.loading) {
        return load(category, 'initial');
      }
      return Promise.resolve();
    },
    [load],
  );

  const refresh = useCallback(
    (category: ActivityCenterTab) => load(category, 'refresh'),
    [load],
  );

  const loadMore = useCallback(
    (category: ActivityCenterTab) => load(category, 'more'),
    [load],
  );

  return {
    state,
    ensureLoaded,
    refresh,
    retry: (category: ActivityCenterTab) => load(category, 'initial'),
    loadMore,
  };
}
