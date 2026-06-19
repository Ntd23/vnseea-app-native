// Stories - useStoriesListViewModel
//
// Powers the StoriesListScreen grid. Wraps `useStoriesViewModel` (which groups
// stories per-publisher for the rail) and flattens each publisher's media
// segments into individual rows, sorted by `postedAt DESC`. That way each
// tap on a grid cell opens the existing StoryViewerScreen at the matching
// publisher index — the viewer's segment progression handles playback from
// there.
//
// Shape contract (consumed by StoriesListScreen):
//
//   {
//     stories: StoryItem[],          // per-segment rows, newest first
//     isLoading: boolean,            // first fetch in flight
//     isRefreshing: boolean,         // pull-to-refresh in flight
//     error: string | null,
//     reload: () => Promise<void>,   // pull-to-refresh
//     loadMore: () => void,          // no-op (backend uncursored — see useStoriesViewModel)
//     hasMore: boolean,              // false for now
//   }
//
// Pagination: the WoWonder `getStories` endpoint is uncursored for Phase 1
// (see comments in `useStoriesViewModel`). `hasMore` is hard-coded false so
// the UI never tries to call `loadMore`, but the API is in place so a future
// cursor can drop in without touching the screen.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoriesViewModel } from './useStoriesViewModel';
import type { StoryItem } from '../../domain/types/stories.types';

const NOOP = (): void => {
  // Intentional no-op: backend has no pagination for stories (Phase 1).
};

export interface StoriesListRow {
  /** Stable row id — combines publisher + segment id for keying FlatList. */
  key: string;
  /** Index in the flattened list (used as initial segment index for the viewer). */
  index: number;
  /** The publisher this row belongs to (mirrors StoryItem shape). */
  publisher: StoryItem['publisher'];
  /** Cover image URL — first segment's URL or the publisher avatar. */
  coverUrl: string;
  /** The actual story segment being shown in the cell. */
  segment: StoryItem['media'][number];
  /** True when the segment is a video (used to overlay a play icon). */
  isVideo: boolean;
  /** Publisher id — drives the nav back to StoryViewerScreen. */
  publisherUserId: string;
  /** Unix seconds — when this segment was posted. */
  postedAt: number;
  /** Whether the viewer has already seen this segment. */
  isViewed: boolean;
  /** Whether this row has unseen segments remaining for the publisher. */
  hasUnseen: boolean;
  /** Total segments the publisher has — used for the count badge. */
  segmentCount: number;
}

export interface UseStoriesListViewModelOptions {
  initialStories?: StoryItem[];
}

export function useStoriesListViewModel(options: UseStoriesListViewModelOptions = {}) {
  const {
    stories,
    isLoading,
    reloadStories,
  } = useStoriesViewModel();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overrideStories, setOverrideStories] = useState<StoryItem[] | null>(
    options.initialStories && options.initialStories.length > 0
      ? options.initialStories
      : null,
  );

  useEffect(() => {
    setOverrideStories(
      options.initialStories && options.initialStories.length > 0
        ? options.initialStories
        : null,
    );
  }, [options.initialStories]);

  // Wrap the underlying reload so we can present a separate "refreshing"
  // state for the pull-to-refresh spinner while the loading skeleton only
  // shows on the very first fetch.
  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setOverrideStories(null);
      await reloadStories();
    } finally {
      setIsRefreshing(false);
    }
  }, [reloadStories]);

  const sourceStories = overrideStories ?? stories;

  // Build one grid row per publisher/story bubble. The viewer owns segment
  // progression, so the grid only needs the freshest segment as the cover.
  const flatRows = useMemo<StoriesListRow[]>(() => {
    const rows: StoriesListRow[] = [];
    for (const story of sourceStories) {
      const sortedMedia = [...story.media].sort((a, b) => {
        const aTs = a.postedAt ?? story.postedAt;
        const bTs = b.postedAt ?? story.postedAt;
        return (bTs ?? 0) - (aTs ?? 0);
      });

      const segment = sortedMedia[0];
      if (!segment) continue;

      const coverUrl = segment.url || story.thumbnailUrl || story.publisher.avatarUrl || '';
      rows.push({
        key: `${story.publisher.userId}-${story.id}`,
        index: rows.length,
        publisher: story.publisher,
        coverUrl,
        segment,
        isVideo: sortedMedia.some(item => item.type === 'video'),
        publisherUserId: story.publisher.userId,
        postedAt: segment.postedAt ?? story.postedAt,
        isViewed: story.isViewed,
        hasUnseen: story.hasUnseen,
        segmentCount: story.media.length,
      });
    }

    // Newest story first. Ties broken by publisher userId so the order
    // is stable across renders (Array#sort is stable on modern V8/Hermes).
    rows.sort((a, b) => {
      if (b.postedAt !== a.postedAt) return b.postedAt - a.postedAt;
      return a.publisherUserId.localeCompare(b.publisherUserId);
    });

    // Re-stamp indexes after sort so the screen can pass `index` straight
    // to `StoryViewer`'s `initialUserIndex`.
    return rows.map((row, idx) => ({ ...row, index: idx }));
  }, [sourceStories]);

  // Resolve the StoryItem list in the SAME order as the rows so the tapped
  // row index lines up exactly with StoryViewer's `initialUserIndex`.
  const pagedStories = useMemo<StoryItem[]>(() => {
    const publisherToStory = new Map<string, StoryItem>();
    for (const story of sourceStories) {
      publisherToStory.set(story.publisher.userId, story);
    }
    const seenPublishers = new Set<string>();
    const ordered: StoryItem[] = [];
    for (const row of flatRows) {
      if (seenPublishers.has(row.publisherUserId)) continue;
      const match = publisherToStory.get(row.publisherUserId);
      if (match) {
        ordered.push(match);
        seenPublishers.add(row.publisherUserId);
      }
    }
    return ordered;
  }, [flatRows, sourceStories]);

  // Auto-trigger an initial refresh whenever the screen mounts so the grid
  // always opens with fresh data — matches the rail's behaviour.
  useEffect(() => {
    if (!overrideStories) {
      void reloadStories();
    }
  }, [overrideStories, reloadStories]);

  return {
    rows: flatRows,
    pagedStories,
    isLoading: overrideStories ? false : isLoading,
    isRefreshing,
    error: null as string | null,
    reload,
    loadMore: NOOP,
    hasMore: false,
  };
}
