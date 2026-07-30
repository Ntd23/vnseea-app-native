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

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type SetStateAction,
} from 'react';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { storyReactedEvents } from '../events/storyReactedEvents';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { StoryItem, StoryMedia } from '../../domain/types/stories.types';
import {
  filterActiveStories,
  getStoryActiveUntil,
  isStoryActiveWithin24Hours,
} from '../../domain/policies/storyExpiration';
import {
  storiesResource,
  type StoriesResourceLoadOptions,
} from '../state/storiesResource';

const repository = createStoriesRepository();

export type StoriesReloadOptions = StoriesResourceLoadOptions;

function getStoriesResourceKey() {
  const session = sessionStorage.getSession();
  if (session?.userId) return `user:${session.userId}`;
  if (session?.accessToken) return `token:${session.accessToken}`;
  return 'anonymous';
}

export function useStoriesViewModel() {
  const resourceKey = getStoriesResourceKey();
  const subscribe = useCallback(
    (listener: () => void) => storiesResource.subscribe(resourceKey, listener),
    [resourceKey],
  );
  const getSnapshot = useCallback(
    () => storiesResource.getState(resourceKey),
    [resourceKey],
  );
  const resourceState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  const stories = resourceState.stories;
  const isLoading = resourceState.isFetching && stories.length === 0;
  const error = resourceState.error;
  const setStories = useCallback(
    (action: SetStateAction<StoryItem[]>) => {
      storiesResource.update(resourceKey, current =>
        typeof action === 'function' ? action(current) : action,
      );
    },
    [resourceKey],
  );
  const setError = useCallback(
    (nextError: string | null) => {
      storiesResource.setError(resourceKey, nextError);
    },
    [resourceKey],
  );

  /**
   * Load stories from API OR mock data for testing. Uncomment mock section
   * to test Facebook-style grouping without backend.
   */
  const loadStories = useCallback(
    async (options: StoriesReloadOptions = {}) => {
      await storiesResource.load(
        resourceKey,
        async () => {
          const [friendsStories, allUserStories] = await Promise.all([
            repository.getStories(),
            repository.getUserStories(),
          ]);

          const sessionUserId = sessionStorage.getSession()?.userId;
          const now = Math.floor(Date.now() / 1000);
          const activeUserStories = filterActiveStories(allUserStories, now);
          const activeFriendsStories = filterActiveStories(friendsStories, now);

          // Filter own stories using session userId (cast to string to prevent type mismatch)
          // after enforcing the shared 24-hour visibility window.
          const ownStories = activeUserStories.filter(story =>
            sessionUserId
              ? String(story.publisher.userId) === String(sessionUserId)
              : story.isOwner,
          );

          // Filter friends' stories from allUserStories (which contains all segments of friends)
          const friendsStoriesFromUserStories = activeUserStories.filter(
            story =>
              sessionUserId
                ? String(story.publisher.userId) !== String(sessionUserId)
                : !story.isOwner,
          );

          const friendsStoriesFiltered = activeFriendsStories;

          // Deduplicate and merge flat stories
          const merged: StoryItem[] = [];
          for (const story of ownStories) {
            if (!merged.some(s => s.id === story.id)) {
              merged.push(story);
            }
          }
          for (const story of friendsStoriesFromUserStories) {
            if (!merged.some(s => s.id === story.id)) {
              merged.push(story);
            }
          }
          for (const story of friendsStoriesFiltered) {
            if (!merged.some(s => s.id === story.id)) {
              merged.push(story);
            }
          }

          // Group stories by publisher.userId
          const userStoriesMap = new Map<string, StoryItem[]>();
          for (const story of merged) {
            const userId = story.publisher.userId;
            if (!userStoriesMap.has(userId)) {
              userStoriesMap.set(userId, []);
            }
            userStoriesMap.get(userId)!.push(story);
          }

          const grouped: StoryItem[] = [];
          for (const [_userId, userStories] of userStoriesMap.entries()) {
            // Sort userStories by postedAt ASC (oldest first) so they play in chronological order
            userStories.sort((a, b) => (a.postedAt || 0) - (b.postedAt || 0));

            const latestStory = userStories[userStories.length - 1];
            const oldestStory = userStories[0];

            // Combine all media segments from all stories of this user
            const media: StoryMedia[] = [];
            for (const s of userStories) {
              // Make sure each segment is tagged with its parent storyId and postedAt timestamp
              const storyId = s.id;
              const postedAt = s.postedAt;
              const mappedMedia = s.media.map(m => ({
                ...m,
                storyId,
                postedAt,
              }));
              media.push(...mappedMedia);
            }

            // Determine if there are any unseen segments
            const hasUnseen = userStories.some(s => s.hasUnseen && !s.isViewed);
            const isViewed = userStories.every(s => s.isViewed);

            grouped.push({
              id: latestStory.id, // Use the latest story ID as the primary ID for the bubble
              publisher: latestStory.publisher,
              title: latestStory.title,
              description: latestStory.description,
              postedAt: latestStory.postedAt,
              expiresAt: latestStory.expiresAt,
              thumbnailUrl:
                latestStory.thumbnailUrl ?? oldestStory.thumbnailUrl,
              media,
              isOwner: latestStory.isOwner,
              isViewed,
              hasUnseen,
              myReaction: latestStory.myReaction,
              reactionCount: latestStory.reactionCount,
            });
          }

          // Sort the grouped bubbles: the logged-in user's bubble should always be first
          // followed by others sorted by postedAt DESC (newest story first)
          grouped.sort((a, b) => {
            if (a.isOwner && !b.isOwner) return -1;
            if (!a.isOwner && b.isOwner) return 1;
            return (b.postedAt || 0) - (a.postedAt || 0);
          });

          return filterActiveStories(grouped, now);
        },
        options,
      );
    },
    [resourceKey],
  );

  useEffect(() => {
    loadStories().catch(() => undefined);
  }, [loadStories]);

  useEffect(() => {
    if (stories.length === 0) return;

    const now = Math.floor(Date.now() / 1000);
    const nextExpiry = stories.reduce(
      (earliest, story) => Math.min(earliest, getStoryActiveUntil(story)),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(nextExpiry)) return;

    const delayMs = Math.max(1000, (nextExpiry - now + 1) * 1000);
    const timer = setTimeout(() => {
      setStories(current => filterActiveStories(current));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [setStories, stories]);

  useEffect(() => {
    const unsubReacted = storyReactedEvents.subscribe((storyId, reaction) => {
      setStories(prev =>
        prev.map(story => {
          const hasSegment = story.media.some(
            m => m.storyId === storyId || m.id === storyId,
          );
          if (story.id !== storyId && !hasSegment) return story;

          const wasReacted = story.myReaction !== null;
          const willBeReacted = reaction !== null;
          const delta = Number(willBeReacted) - Number(wasReacted);

          return {
            ...story,
            myReaction: reaction,
            reactionCount: Math.max(0, story.reactionCount + delta),
          };
        }),
      );
    });

    return () => {
      unsubReacted();
    };
  }, [setStories]);

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
    [setStories, stories],
  );

  /**
   * Delete a story segment the viewer owns. Optimistic removal from the list,
   * rolled back on server error.
   */
  const deleteStory = useCallback(
    async (storyId: string) => {
      let removedSegment: StoryMedia | undefined;
      let parentStory: StoryItem | undefined;

      setStories(prev => {
        return prev
          .map(story => {
            const segmentIdx = story.media.findIndex(
              m => m.storyId === storyId || m.id === storyId,
            );
            if (segmentIdx === -1) return story;

            removedSegment = story.media[segmentIdx];
            parentStory = story;

            const nextMedia = story.media.filter(
              m => m.storyId !== storyId && m.id !== storyId,
            );
            if (nextMedia.length === 0) return null;
            return {
              ...story,
              media: nextMedia,
              id:
                story.id === storyId
                  ? nextMedia[nextMedia.length - 1].storyId ?? story.id
                  : story.id,
            };
          })
          .filter((s): s is StoryItem => s !== null);
      });

      try {
        await repository.deleteStory(storyId);
      } catch (caught) {
        // Rollback: if a segment was removed, restore it
        if (removedSegment && parentStory) {
          const segment = removedSegment;
          const parent = parentStory;
          setStories(prev => {
            const idx = prev.findIndex(
              s => s.publisher.userId === parent.publisher.userId,
            );
            if (idx !== -1) {
              const existing = prev[idx];
              const nextMedia = [...existing.media];
              nextMedia.push(segment);
              return prev.map((s, i) =>
                i === idx ? { ...existing, media: nextMedia } : s,
              );
            } else {
              return [...prev, { ...parent, media: [segment] }];
            }
          });
        }
        setError(
          caught instanceof Error ? caught.message : 'Không xoá được tin.',
        );
      }
    },
    [setError, setStories],
  );

  /**
   * Prepend an optimistically-built `StoryItem` to the rail. Phase 2's
   * `useCreateStoryViewModel.submit()` will call this on success so the
   * user sees their new story without a full refetch.
   */
  const prependStory = useCallback(
    (story: StoryItem) => {
      setStories(prev => {
        const userId = story.publisher.userId;
        const existingIdx = prev.findIndex(s => s.publisher.userId === userId);

        // Ensure new story has current timestamp if missing
        const storyWithTimestamp =
          story.postedAt && story.postedAt > 0
            ? story
            : { ...story, postedAt: Math.floor(Date.now() / 1000) };

        if (!isStoryActiveWithin24Hours(storyWithTimestamp)) {
          return filterActiveStories(prev);
        }

        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          const nextMedia = [...existing.media];
          for (const m of storyWithTimestamp.media) {
            if (!nextMedia.some(item => item.url === m.url)) {
              nextMedia.push({ ...m, storyId: storyWithTimestamp.id });
            }
          }

          const updated: StoryItem = {
            ...existing,
            id: storyWithTimestamp.id,
            thumbnailUrl:
              storyWithTimestamp.thumbnailUrl ?? existing.thumbnailUrl,
            media: nextMedia,
            hasUnseen: true,
            isViewed: false,
            postedAt: storyWithTimestamp.postedAt,
            expiresAt: storyWithTimestamp.expiresAt,
          };

          const nextStories = [...prev];
          nextStories.splice(existingIdx, 1);
          return [updated, ...nextStories];
        } else {
          const storyMapped = {
            ...storyWithTimestamp,
            media: storyWithTimestamp.media.map(m => ({
              ...m,
              storyId: storyWithTimestamp.id,
            })),
          };
          return [storyMapped, ...prev];
        }
      });

      // CRITICAL: Force refresh after 2 seconds to get real timestamps from backend
      // This ensures newly uploaded stories appear with correct order
      setTimeout(() => {
        loadStories({ force: true }).catch(() => undefined);
      }, 2000);
    },
    [loadStories, setStories],
  );

  /**
   * Remove a story segment from local state without hitting the server. Used by
   * FeedScreen's `storyDeletedEvents` subscriber when the viewer deletes
   * a story — the viewer already did the API call, the rail just needs
   * to drop its stale copy.
   */
  const removeStoryLocal = useCallback(
    (storyId: string) => {
      setStories(prev => {
        return prev
          .map(story => {
            const nextMedia = story.media.filter(
              m => m.storyId !== storyId && m.id !== storyId,
            );
            if (nextMedia.length === 0) return null;
            return {
              ...story,
              media: nextMedia,
              id:
                story.id === storyId
                  ? nextMedia[nextMedia.length - 1].storyId ?? story.id
                  : story.id,
            };
          })
          .filter((s): s is StoryItem => s !== null);
      });
    },
    [setStories],
  );

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
