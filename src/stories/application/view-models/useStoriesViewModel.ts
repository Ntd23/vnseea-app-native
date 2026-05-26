// Stories - useStoriesViewModel
//
// Owns the list of stories rendered in the home feed's "Tin tức mới" row
// AND consumed by the (Phase 3) full-screen viewer. Same MVVM pattern as
// `useFeedViewModel`:
//
//   • State: `stories`, `isLoading`, `error`
//   • Actions: `reload`, `reactToStory`, `deleteStory`
//   • Optimistic updates with rollback on failure
//
// Phase 1 intentionally stops short of:
//   - Pagination (backend doesn't truly paginate get_stories — see
//     `Wo_GetFriendsStatus` in functions_three.php)
//   - Auto-marking as viewed when a story is opened (needs a viewer UI)
//   - Composer wiring (Phase 2 will add `useCreateStoryViewModel`)

import { useCallback, useEffect, useState } from 'react';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { StoryItem } from '../../domain/types/stories.types';

const repository = createStoriesRepository();

export function useStoriesViewModel() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load stories from API OR mock data for testing. Uncomment mock section
   * to test Facebook-style grouping without backend.
   */
  const loadStories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // OPTION 1: Real API (comment this out when testing mock)
      const [friendsStories, allUserStories] = await Promise.all([
        repository.getStories(),
        repository.getUserStories(),
      ]);

      const sessionUserId = sessionStorage.getSession()?.userId;
      const ownStories = allUserStories.filter(story =>
        sessionUserId ? story.publisher.userId === sessionUserId : story.isOwner
      );

      const merged = [...ownStories];
      for (const story of friendsStories) {
        if (!merged.some(s => s.id === story.id)) {
          merged.push(story);
        }
      }

      setStories(merged);

      // OPTION 2: Mock data for testing multi-segment stories (uncomment to test)
      /*
      const MOCK_STORIES: StoryItem[] = [
        // User 1: 3 photo segments
        {
          id: 'story-1',
          publisher: {
            userId: 'user-1',
            username: 'nguyen_a',
            name: 'Nguyễn Á',
            avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
            isVerified: false,
          },
          title: 'Chillin pool',
          description: 'Cuối tuần thư giãn 🏊',
          postedAt: Math.floor(Date.now() / 1000) - 7200,
          expiresAt: Math.floor(Date.now() / 1000) + 82800,
          thumbnailUrl: 'https://picsum.photos/400/600?random=1',
          media: [
            { id: 'm1-1', type: 'image', url: 'https://picsum.photos/400/600?random=1' },
            { id: 'm1-2', type: 'image', url: 'https://picsum.photos/400/600?random=2' },
            { id: 'm1-3', type: 'image', url: 'https://picsum.photos/400/600?random=3' },
          ],
          isOwner: false,
          isViewed: false,
          hasUnseen: true,
          myReaction: null,
          reactionCount: 5,
        },
        // User 2: 2 video segments
        {
          id: 'story-2',
          publisher: {
            userId: 'user-2',
            username: 'tran_b',
            name: 'Trần B',
            avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
            isVerified: true,
          },
          title: 'Vlog ngày hè',
          postedAt: Math.floor(Date.now() / 1000) - 3600,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          thumbnailUrl: 'https://picsum.photos/400/600?random=4',
          media: [
            { id: 'm2-1', type: 'video', url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
            { id: 'm2-2', type: 'video', url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
          ],
          isOwner: false,
          isViewed: false,
          hasUnseen: true,
          myReaction: 'like',
          reactionCount: 12,
        },
        // User 3: 1 photo (no grouping badge should show)
        {
          id: 'story-3',
          publisher: {
            userId: 'user-3',
            username: 'lee_c',
            name: 'Lê C',
            avatarUrl: 'https://i.pravatar.cc/150?u=user-3',
            isVerified: false,
          },
          title: 'Coffee break ☕',
          postedAt: Math.floor(Date.now() / 1000) - 1800,
          expiresAt: Math.floor(Date.now() / 1000) + 88200,
          thumbnailUrl: 'https://picsum.photos/400/600?random=5',
          media: [
            { id: 'm3-1', type: 'image', url: 'https://picsum.photos/400/600?random=5' },
          ],
          isOwner: false,
          isViewed: false,
          hasUnseen: true,
          myReaction: null,
          reactionCount: 3,
        },
      ];
      setStories(MOCK_STORIES);
      */
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được danh sách tin.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load on first mount. The dependency is `loadStories` (stable
  // because it's wrapped in useCallback with no deps) so this fires once
  // per hook instance, not on every render.
  useEffect(() => {
    void loadStories();
    // Debug log for testing
    console.log('[useStoriesViewModel] Loaded', stories.length, 'stories');
  }, [loadStories]);

  /**
   * Toggle the viewer's reaction on a story. The WoWonder
   * `react_story` endpoint is a pure toggle — calling it twice with
   * the same reaction removes it. We mirror that semantics here so
   * the picker behaviour matches feed posts:
   *
   *   • No reaction + 'like' → adds 'like'
   *   • Has 'like'  + 'like' → removes (toggle off)
   *   • Has 'like'  + 'love' → backend would re-add 'like' (no swap),
   *     so we emulate the swap with TWO sequential calls (clear then
   *     add) and show the UI as if a single swap happened.
   *
   * On failure we roll the touched story back to its pre-toggle snapshot.
   */
  const reactToStory = useCallback(
    async (storyId: string, nextReaction: ReactionType) => {
      let snapshot: StoryItem | undefined;

      // Compute the optimistic target reaction up front so we know whether
      // the UI should show 'cleared' vs 'swapped'.
      const current = stories.find(s => s.id === storyId);
      const willClear = current?.myReaction === nextReaction;
      const optimisticReaction: ReactionType | null = willClear
        ? null
        : nextReaction;

      // Apply optimistic update.
      setStories(prev =>
        prev.map(story => {
          if (story.id !== storyId) return story;
          snapshot = story;
          const wasReacted = story.myReaction !== null;
          const willBeReacted = optimisticReaction !== null;
          const delta = Number(willBeReacted) - Number(wasReacted);
          return {
            ...story,
            myReaction: optimisticReaction,
            reactionCount: Math.max(0, story.reactionCount + delta),
          };
        }),
      );

      try {
        if (current?.myReaction && current.myReaction !== nextReaction) {
          // SWAP: backend has no swap — emulate by clearing the old
          // reaction first, then adding the new one. If the second call
          // fails the rollback below restores the original state.
          await repository.reactStory(storyId, current.myReaction);
          await repository.reactStory(storyId, nextReaction);
        } else {
          // Simple add OR toggle-off.
          await repository.reactStory(storyId, nextReaction);
        }
      } catch {
        if (snapshot) {
          const original = snapshot;
          setStories(prev =>
            prev.map(story => (story.id === storyId ? original : story)),
          );
        }
      }
    },
    [stories],
  );

  /**
   * Delete a story the viewer owns. Optimistic removal from the list,
   * rolled back on server error.
   */
  const deleteStory = useCallback(async (storyId: string) => {
    let removed: StoryItem | undefined;
    let removedIndex = -1;

    setStories(prev => {
      const idx = prev.findIndex(s => s.id === storyId);
      if (idx === -1) return prev;
      removed = prev[idx];
      removedIndex = idx;
      return prev.filter(s => s.id !== storyId);
    });

    if (!removed) return;

    try {
      await repository.deleteStory(storyId);
    } catch (caught) {
      // Rollback at the original index so the rail order is preserved.
      const restored = removed;
      const insertAt = removedIndex;
      setStories(prev => {
        const next = [...prev];
        next.splice(insertAt, 0, restored);
        return next;
      });
      setError(
        caught instanceof Error ? caught.message : 'Không xoá được tin.',
      );
    }
  }, []);

  /**
   * Prepend an optimistically-built `StoryItem` to the rail. Phase 2's
   * `useCreateStoryViewModel.submit()` will call this on success so the
   * user sees their new story without a full refetch.
   */
  const prependStory = useCallback((story: StoryItem) => {
    setStories(prev => {
      // Dedupe by id in case the create response and a subsequent reload
      // both produce the same story.
      if (prev.some(s => s.id === story.id)) return prev;
      return [story, ...prev];
    });
  }, []);

  /**
   * Remove a story from local state without hitting the server. Used by
   * FeedScreen's `storyDeletedEvents` subscriber when the viewer deletes
   * a story — the viewer already did the API call, the rail just needs
   * to drop its stale copy.
   */
  const removeStoryLocal = useCallback((storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
  }, []);

  return {
    stories,
    isLoading,
    error,
    reloadStories: loadStories,
    reactToStory,
    deleteStory,
    prependStory,
    removeStoryLocal,
  };
}
