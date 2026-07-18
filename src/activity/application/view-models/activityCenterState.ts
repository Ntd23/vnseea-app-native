// Description: Provides pure independent-tab state transitions for Activity Center.
import type {
  ActivityCenterTab,
  PostActivityItem,
  PostActivityPage,
} from '../../domain/types/activity.types';

export interface ActivityTabState {
  items: PostActivityItem[];
  loaded: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  nextCursor?: string;
  hasMore: boolean;
}

export type ActivityCenterState = Record<ActivityCenterTab, ActivityTabState>;

export const ACTIVITY_CENTER_TABS: ActivityCenterTab[] = [
  'saved',
  'reaction',
  'comment',
  'share',
];

function createTabState(): ActivityTabState {
  return {
    items: [],
    loaded: false,
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    hasMore: false,
  };
}

export function createActivityCenterState(): ActivityCenterState {
  return {
    saved: createTabState(),
    reaction: createTabState(),
    comment: createTabState(),
    share: createTabState(),
  };
}

export function replaceActivityPage(
  state: ActivityCenterState,
  category: ActivityCenterTab,
  page: PostActivityPage,
): ActivityCenterState {
  return {
    ...state,
    [category]: {
      ...state[category],
      items: page.items,
      loaded: true,
      loading: false,
      refreshing: false,
      loadingMore: false,
      error: null,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    },
  };
}

export function appendActivityPage(
  state: ActivityCenterState,
  category: ActivityCenterTab,
  page: PostActivityPage,
): ActivityCenterState {
  const existing = state[category].items;
  const seen = new Set(existing.map(item => item.postId));
  const appended = page.items.filter(item => !seen.has(item.postId));
  return {
    ...state,
    [category]: {
      ...state[category],
      items: [...existing, ...appended],
      loaded: true,
      loading: false,
      refreshing: false,
      loadingMore: false,
      error: null,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    },
  };
}
