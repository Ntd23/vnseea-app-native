// Description: ViewModel for the TikTok-style reels feed.
//   - Manages paginated reel list (initial load, refresh, load-more)
//   - Tracks the currently-visible reel index for autoplay
//   - Optimistic like / save toggles with rollback on error
//
// Memory note: this hook only owns the *data*. The screen layer is
// responsible for deciding which VideoPlayer instances are mounted at any
// given moment (only items within ±1 of activeIndex) so the device never
// holds more than 3 decoders simultaneously.

import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createAuthRepository } from '../../../auth/infrastructure/repositories/ApiAuthRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import type {
  CommentAudioAttachment,
  CommentImageAttachment,
  ReactionType,
  ReelComment,
  ReelPublisher,
  ReelsItem,
} from '../../domain/types/reels.types';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';

const repository = createReelsRepository();
const feedRepository = createFeedRepository();

const mapFeedVideoToReel = (post: FeedVideoPost): ReelsItem => {
  return {
    id: post.id,
    videoUrl: post.videoUrl,
    thumbnailUrl: post.thumbnailUrl,
    caption: post.caption,
    postedAt: post.postedAt,
    publisher: {
      userId: post.publisher.id,
      username: post.publisher.username,
      name: post.publisher.name,
      avatarUrl: post.publisher.avatarUrl,
      isVerified: false,
    },
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewCount: 0,
    isLiked: post.isLiked,
    isSaved: false,
    myReaction: post.myReaction,
  };
};

const PAGE_SIZE = 10;
const COMMENT_PAGE_SIZE = 20;

type LoadPhase = 'idle' | 'initial' | 'refreshing' | 'loading-more';
type CommentPhase = 'idle' | 'loading' | 'loading-more' | 'submitting';
type CommentsCacheEntry = {
  comments: ReelComment[];
  hasMore: boolean;
  offset: number;
  updatedAt: number;
};

function getReelSortTimestamp(item?: ReelsItem | null) {
  const value = Number(item?.postedAt);
  return Number.isFinite(value) ? value : 0;
}

function getReelSortId(item?: ReelsItem | null) {
  const value = Number(item?.id);
  return Number.isFinite(value) ? value : 0;
}

function compareReelsNewestFirst(a: ReelsItem, b: ReelsItem) {
  const timeDelta = getReelSortTimestamp(b) - getReelSortTimestamp(a);
  if (timeDelta !== 0) return timeDelta;
  return getReelSortId(b) - getReelSortId(a);
}

export function useReelsViewModel(initialVideo?: { id: string; post: FeedVideoPost }) {
  const [items, setItems] = useState<ReelsItem[]>(() =>
    initialVideo ? [mapFeedVideoToReel(initialVideo.post)] : [],
  );
  // Seed the ref synchronously from the constructor argument so the
  // initial-load `loadInitial()` (which fires in a useEffect on mount)
  // can see the deeplinked / clicked video BEFORE the network round-trip
  // completes. Without this seed, `setInitialVideo()` in the screen
  // races with `loadInitial()`: the latter overwrites `items` with the
  // latest feed and resets `activeIndex` back to 0, so the user lands
  // on the newest reel instead of the one they tapped.
  const initialVideoInfoRef = useRef<{ id: string; post: FeedVideoPost } | null>(
    initialVideo ?? null,
  );
  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentPhase, setCommentPhase] = useState<CommentPhase>('idle');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  // ── Current user — for optimistic comment rendering ──────────────────
  //
  // We seed `currentUser` synchronously from MMKV (so the very first
  // render already has a real name + avatar when available), then refresh
  // it in the background via `/api/get-user-data` which IS deployed on
  // every WoWonder install (unlike `/api/get-current-user`).
  //
  // Failure modes:
  //   • No cache + no network         → `currentUser` stays null,
  //                                     getFallbackPublisher falls back
  //                                     to "Tôi"
  //   • Cache hit, fetch fails        → stays on cached profile, no blip
  //   • Cache miss, fetch succeeds    → first comment uses "Tôi" briefly,
  //                                     then subsequent comments use real
  //                                     data + cache for next session
  const [currentUser, setCurrentUser] = useState<ReelPublisher | null>(() => {
    const cached = sessionStorage.getUserProfile();
    const sessionUserId = sessionStorage.getSession()?.userId;
    if (!cached || !sessionUserId) return null;
    return {
      userId: sessionUserId,
      username: cached.username || '',
      name: cached.name || '',
      avatarUrl: cached.avatarUrl || undefined,
      isVerified: false,
    };
  });

  useEffect(() => {
    const sessionUserId = sessionStorage.getSession()?.userId;
    if (!sessionUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const authRepo = createAuthRepository();
        const result = await authRepo.fetchUserById(sessionUserId);
        if (cancelled || !result?.user) return;

        const profile: ReelPublisher = {
          userId: result.user.id,
          username: result.user.username || '',
          name: result.user.name || '',
          avatarUrl: result.user.avatar || undefined,
          isVerified: false,
        };
        setCurrentUser(profile);

        // Persist to MMKV so the NEXT session boots straight into the
        // real profile (no network blip on first comment).
        sessionStorage.setUserProfile({
          name: profile.name,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        });
      } catch {
        // Network/auth failure is non-fatal — getFallbackPublisher will
        // fall back to "Tôi" or to mirror an existing comment's
        // publisher. Silently ignored.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'postReactionChanged',
      (event: {
        postId: string;
        myReaction: ReactionType | null;
        likeCount: number;
      }) => {
        setItems(prev =>
          prev.map(item => {
            if (item.id !== event.postId) return item;
            const willBeReacted = event.myReaction !== null;
            if (
              item.myReaction === event.myReaction &&
              item.likeCount === event.likeCount
            ) {
              return item;
            }
            return {
              ...item,
              myReaction: event.myReaction,
              isLiked: willBeReacted,
              likeCount: event.likeCount,
            };
          }),
        );
      },
    );
    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Build a publisher object for OPTIMISTIC comments we render before the
   * server response lands. Walks fastest → most-generic:
   *
   *   1. `currentUser` from `/api/get-user-data` (or MMKV cache)
   *   2. An already-loaded comment authored by the same user (mirror it)
   *   3. Generic "Tôi" stub
   *
   * Steps 1 & 2 give a polished UX. Step 3 is the never-fail safety net
   * — the real publisher data overwrites the optimistic comment as soon
   * as the server responds (~200 ms).
   */
  const getFallbackPublisher = useCallback((): ReelPublisher => {
    if (currentUser) return currentUser;

    const sessionUserId = sessionStorage.getSession()?.userId;
    if (sessionUserId) {
      const existing = comments.find(
        c => c.publisher.userId === sessionUserId || c.owner,
      );
      if (existing) return existing.publisher;
    }
    return {
      userId: sessionUserId || '0',
      username: 'me',
      name: 'Tôi',
      avatarUrl: 'https://demo.vnseea.vn/upload/photos/d-avatar.jpg',
      isVerified: false,
    };
  }, [comments, currentUser]);

  // ── Reply state ──────────────────────────────────────────────────────
  // `repliesById` holds the replies we've loaded for a given comment id.
  // Presence in this map = "user has expanded this comment". An empty
  // array = "expanded but the server returned no replies". `undefined` =
  // "never expanded".
  //
  // `loadingRepliesIds` tracks which comments are currently loading
  // replies so the UI can show a spinner per-thread without blocking the
  // whole sheet.
  //
  // `replyingTo` tells the UI to enter reply mode in the input bar — when
  // non-null, the next submitted text goes through `submitReply` instead
  // of `submitComment`.
  const [repliesById, setRepliesById] = useState<Record<string, ReelComment[]>>({});
  const [loadingRepliesIds, setLoadingRepliesIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  // Cursor + in-flight guard kept in refs so callbacks don't recreate.
  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const commentOffsetRef = useRef(0);
  const commentInFlightRef = useRef(false);
  const commentRequestSeqRef = useRef(0);
  const loadingCommentPostIdRef = useRef<string | null>(null);
  const commentsCacheRef = useRef<Record<string, CommentsCacheEntry>>({});
  // Per-comment cursor for replies (last reply id seen). Kept in a ref so
  // we don't trigger re-renders when bumping it.
  const replyOffsetsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!selectedCommentPostId) return;

    commentsCacheRef.current[selectedCommentPostId] = {
      comments,
      hasMore: hasMoreComments,
      offset: commentOffsetRef.current,
      updatedAt: Date.now(),
    };
  }, [comments, hasMoreComments, selectedCommentPostId]);

  // IDs of reels that failed to play (decode error, 404, dead CDN link, …).
  // Once a reel is flagged, we never show it again in this session — both
  // the existing list AND any future page from the API are filtered against
  // this set. The set is per-session (no MMKV persistence) because URL
  // failures are often transient (network blip, expired token, …).
  const unavailableIdsRef = useRef<Set<string>>(new Set());

  /** Drop one or more bad ids from a freshly-fetched page. */
  const filterUnavailable = useCallback((list: ReelsItem[]) => {
    if (unavailableIdsRef.current.size === 0) return list;
    return list.filter(item => !unavailableIdsRef.current.has(item.id));
  }, []);

  /** Load the first page (used on mount + when the user explicitly retries). */
  const loadInitial = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPhase('initial');
    setError(null);
    try {
      const page = await repository.fetchReels({ limit: PAGE_SIZE });
      let nextItems = filterUnavailable(page.items);
      let targetActiveIndex = 0;

      if (initialVideoInfoRef.current) {
        const { id, post } = initialVideoInfoRef.current;
        const mapped = mapFeedVideoToReel(post);
        nextItems = [
          mapped,
          ...nextItems.filter(item => String(item.id) !== String(id)),
        ];
        targetActiveIndex = 0;
        initialVideoInfoRef.current = null; // consumed
      }

      setItems(nextItems);
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
      setActiveIndex(targetActiveIndex);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không tải được reels.',
      );
    } finally {
      setPhase('idle');
      inFlightRef.current = false;
    }
  }, [filterUnavailable]);

  /** Pull-to-refresh — replaces the list with a fresh first page. */
  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPhase('refreshing');
    setError(null);
    try {
      const page = await repository.fetchReels({ limit: PAGE_SIZE });
      setItems(filterUnavailable(page.items));
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
      setActiveIndex(0);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không tải lại được reels.',
      );
    } finally {
      setPhase('idle');
      inFlightRef.current = false;
    }
  }, [filterUnavailable]);

  /** Append the next page — called when the user scrolls near the end. */
  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!hasMore) return;
    if (cursorRef.current === null) return;

    inFlightRef.current = true;
    setPhase('loading-more');
    try {
      const page = await repository.fetchReels({
        limit: PAGE_SIZE,
        cursor: cursorRef.current,
      });

      setItems(prev => {
        // Dedup by id in case the server returns overlapping items, AND
        // drop any ids we've already marked unavailable in this session.
        const seen = new Set(prev.map(item => item.id));
        const fresh = filterUnavailable(page.items).filter(
          item => !seen.has(item.id),
        );
        return [...prev, ...fresh];
      });

      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch {
      // Soft fail — let user try again by scrolling. Don't flip the error
      // banner here because they still have items to watch.
    } finally {
      setPhase('idle');
      inFlightRef.current = false;
    }
  }, [hasMore, filterUnavailable]);

  const peekLatestReels = useCallback(async (limit = PAGE_SIZE) => {
    const page = await repository.fetchReels({ limit });
    return filterUnavailable(page.items)
      .slice()
      .sort(compareReelsNewestFirst);
  }, [filterUnavailable]);

  const prependReels = useCallback((newItems: ReelsItem[]) => {
    if (newItems.length === 0) return;

    const playableItems = filterUnavailable(newItems)
      .filter(item => Boolean(item?.id && item.videoUrl))
      .slice()
      .sort(compareReelsNewestFirst);

    if (playableItems.length === 0) return;

    setItems(prev => {
      const seen = new Set(prev.map(item => item.id));
      const fresh = playableItems.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      if (fresh.length === 0) return prev;
      return [...fresh, ...prev];
    });
    setActiveIndex(0);
  }, [filterUnavailable]);

  /**
   * Called by `ReelItem` when its VideoPlayer reports a decode error.
   *
   * Behaviour:
   *   • Remember the bad id forever (session-scoped Set) so the same reel
   *     can't be re-added on pull-to-refresh OR by a future page load.
   *   • If the bad reel sits AT OR AFTER `activeIndex`, drop it from the
   *     list — the next reel naturally snaps into place via FlatList's
   *     pagingEnabled + getItemLayout.
   *   • If it sits BEFORE `activeIndex`, leave it in the list. The user
   *     has already scrolled past, so they won't see it; removing would
   *     instead force the FlatList's scroll position to shift by one item
   *     and visually jump the user forward to the wrong reel.
   *     (It costs ~1KB of unused data — VideoPlayer is unmounted because
   *     distance > PRELOAD_RADIUS, so no decoder is held in RAM.)
   */
  const markUnavailable = useCallback((postId: string) => {
    if (unavailableIdsRef.current.has(postId)) return;
    unavailableIdsRef.current.add(postId);

    setItems(prev => {
      const removedIndex = prev.findIndex(item => item.id === postId);
      if (removedIndex === -1) return prev;

      // Decide whether to actually remove based on the CURRENT activeIndex.
      // We use the functional setActiveIndex purely as a way to read the
      // freshest value without adding it to this callback's deps.
      let shouldRemove = false;
      setActiveIndex(currentIdx => {
        shouldRemove = removedIndex >= currentIdx;
        if (!shouldRemove) return currentIdx;

        const nextLen = prev.length - 1;
        if (nextLen <= 0) return 0;
        // If we removed the active reel, keep activeIndex pointing at the
        // same slot — the next reel slides up to fill it. Clamp so we
        // don't run past the end of the list.
        if (removedIndex === currentIdx) {
          return Math.min(currentIdx, nextLen - 1);
        }
        return currentIdx;
      });

      return shouldRemove
        ? prev.filter(item => item.id !== postId)
        : prev;
    });
  }, []);

  // Optimistic like — flips locally first, rolls back if the request fails.
  const toggleLike = useCallback(async (postId: string) => {
    let snapshot: ReelsItem | undefined;
    setItems(prev =>
      prev.map(item => {
        if (item.id !== postId) return item;
        snapshot = item;
        return {
          ...item,
          isLiked: !item.isLiked,
          likeCount: Math.max(0, item.likeCount + (item.isLiked ? -1 : 1)),
        };
      }),
    );

    try {
      const result = await repository.toggleLike(postId);
      setItems(prev =>
        prev.map(item =>
          item.id === postId
            ? { ...item, isLiked: result.isLiked, likeCount: result.likeCount }
            : item,
        ),
      );
    } catch {
      // Rollback to snapshot
      if (snapshot) {
        const original = snapshot;
        setItems(prev =>
          prev.map(item => (item.id === postId ? original : item)),
        );
      }
    }
  }, []);

  /**
   * Toggle a rich reaction on a reel.
   *
   * Semantics:
   *   • If the user has NO reaction → adds `nextReaction`
   *   • If the user has a DIFFERENT reaction → swaps to `nextReaction`
   *   • If the user has the SAME reaction → clears (toggles off)
   *
   * The UI runs this optimistically (heart flips colour instantly), then
   * reconciles with the API. On failure we roll back to the snapshot.
   *
   * `likeCount` is adjusted client-side because the WoWonder reaction
   * endpoint doesn't return an updated total. That's safe because we
   * fully control transitions: +1 going from null→any, -1 going from
   * any→null, ±0 going between two non-null reactions (swap).
   */
  const toggleReaction = useCallback(
    async (postId: string, nextReaction: ReactionType, forceSet?: boolean) => {
      let snapshot: ReelsItem | undefined;
      let targetReaction: ReactionType | null = nextReaction;
      let finalLikeCount = 0;

      setItems(prev =>
        prev.map(item => {
          if (item.id !== postId) return item;
          snapshot = item;

          // Same reaction tapped twice = clear it (unless forceSet is true)
          const willClear = !forceSet && item.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;

          // Count delta: 0 when swapping between reactions, ±1 at the
          // null boundary.
          const wasReacted = item.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);

          finalLikeCount = Math.max(0, item.likeCount + countDelta);

          return {
            ...item,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount: finalLikeCount,
          };
        }),
      );

      // Emit global reaction changed event
      DeviceEventEmitter.emit('postReactionChanged', {
        postId,
        myReaction: targetReaction,
        likeCount: finalLikeCount,
        topReactions: targetReaction ? [targetReaction] : [],
      });

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setItems(prev =>
            prev.map(item => (item.id === postId ? original : item)),
          );
          // Re-emit original reaction on failure
          DeviceEventEmitter.emit('postReactionChanged', {
            postId,
            myReaction: original.myReaction,
            likeCount: original.likeCount,
            topReactions: original.myReaction ? [original.myReaction] : [],
          });
        }
      }
    },
    [],
  );

  // Optimistic save — same pattern as like.
  const toggleSave = useCallback(async (postId: string) => {
    let snapshot: ReelsItem | undefined;
    setItems(prev =>
      prev.map(item => {
        if (item.id !== postId) return item;
        snapshot = item;
        return { ...item, isSaved: !item.isSaved };
      }),
    );

    try {
      const result = await repository.toggleSave(postId);
      setItems(prev =>
        prev.map(item =>
          item.id === postId ? { ...item, isSaved: result.isSaved } : item,
        ),
      );
    } catch {
      if (snapshot) {
        const original = snapshot;
        setItems(prev =>
          prev.map(item => (item.id === postId ? original : item)),
        );
      }
    }
  }, []);

  const openComments = useCallback(async (postId: string) => {
    if (
      commentInFlightRef.current &&
      loadingCommentPostIdRef.current === postId &&
      selectedCommentPostId === postId
    ) {
      return;
    }

    const requestSeq = ++commentRequestSeqRef.current;
    const cached = commentsCacheRef.current[postId];
    commentInFlightRef.current = true;
    loadingCommentPostIdRef.current = postId;
    setSelectedCommentPostId(postId);
    setComments(cached?.comments ?? []);
    setHasMoreComments(cached?.hasMore ?? false);
    setCommentPhase('loading');
    setCommentError(null);
    setRepliesById({});
    setLoadingRepliesIds([]);
    setReplyingTo(null);
    replyOffsetsRef.current = {};
    commentOffsetRef.current = cached?.offset ?? 0;

    try {
      const nextComments = await repository.getComments(postId, {
        limit: COMMENT_PAGE_SIZE,
        offset: 0,
      });
      if (commentRequestSeqRef.current !== requestSeq) return;
      setComments(nextComments);
      setHasMoreComments(nextComments.length >= COMMENT_PAGE_SIZE);
      const lastComment = nextComments[nextComments.length - 1];
      commentOffsetRef.current = Number(lastComment?.id ?? 0) || 0;
      commentsCacheRef.current[postId] = {
        comments: nextComments,
        hasMore: nextComments.length >= COMMENT_PAGE_SIZE,
        offset: commentOffsetRef.current,
        updatedAt: Date.now(),
      };
    } catch (caught) {
      if (commentRequestSeqRef.current !== requestSeq) return;
      setCommentError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được bình luận.',
      );
    } finally {
      if (commentRequestSeqRef.current === requestSeq) {
        setCommentPhase('idle');
        commentInFlightRef.current = false;
        loadingCommentPostIdRef.current = null;
      }
    }
  }, [selectedCommentPostId]);
  const closeComments = useCallback(() => {
    commentRequestSeqRef.current += 1;
    commentInFlightRef.current = false;
    loadingCommentPostIdRef.current = null;
    setSelectedCommentPostId(null);
    setComments([]);
    setCommentError(null);
    setCommentPhase('idle');
    setHasMoreComments(false);
    setRepliesById({});
    setLoadingRepliesIds([]);
    setReplyingTo(null);
    commentOffsetRef.current = 0;
    replyOffsetsRef.current = {};
  }, []);

  const loadMoreComments = useCallback(async () => {
    if (!selectedCommentPostId) return;
    if (!hasMoreComments) return;
    if (commentInFlightRef.current) return;

    commentInFlightRef.current = true;
    loadingCommentPostIdRef.current = selectedCommentPostId;
    const requestSeq = ++commentRequestSeqRef.current;
    setCommentPhase('loading-more');
    setCommentError(null);

    try {
      const nextComments = await repository.getComments(selectedCommentPostId, {
        limit: COMMENT_PAGE_SIZE,
        offset: commentOffsetRef.current,
      });
      if (commentRequestSeqRef.current !== requestSeq) return;
      setComments(prev => {
        const seen = new Set(prev.map(comment => comment.id));
        const fresh = nextComments.filter(comment => !seen.has(comment.id));
        return [...prev, ...fresh];
      });
      setHasMoreComments(nextComments.length >= COMMENT_PAGE_SIZE);
      const lastComment = nextComments[nextComments.length - 1];
      if (lastComment) {
        commentOffsetRef.current = Number(lastComment.id) || commentOffsetRef.current;
      }
    } catch (caught) {
      if (commentRequestSeqRef.current !== requestSeq) return;
      setCommentError(
        caught instanceof Error
          ? caught.message
          : 'Không tải thêm được bình luận.',
      );
    } finally {
      if (commentRequestSeqRef.current === requestSeq) {
        setCommentPhase('idle');
        commentInFlightRef.current = false;
        loadingCommentPostIdRef.current = null;
      }
    }
  }, [hasMoreComments, selectedCommentPostId]);

  const submitComment = useCallback(
    async (
      text: string,
      image?: CommentImageAttachment,
      audio?: CommentAudioAttachment,
    ) => {
      const trimmed = text.trim();
      // Allow image-only comments (backend does too).
      if (!selectedCommentPostId || (!trimmed && !image && !audio)) return null;

      const tempId = `temp-${Date.now()}`;
      const publisher = getFallbackPublisher();
      const newComment: ReelComment = {
        id: tempId,
        text: trimmed,
        postedAt: Math.floor(Date.now() / 1000),
        publisher,
        likeCount: 0,
        replyCount: 0,
        isLiked: false,
        myReaction: null,
        owner: true,
        postOwner: false,
        isSending: true,
        pendingImageUri: image?.uri,
        imageWidth: image?.width,
        imageHeight: image?.height,
        pendingAudioUri: audio?.uri,
      };

      // Add the optimistic comment instantly
      setComments(prev => [...prev, newComment]);

      // Increment count on the post optimistically
      setItems(prev =>
        prev.map(item =>
          item.id === selectedCommentPostId
            ? { ...item, commentCount: item.commentCount + 1 }
            : item,
        ),
      );

      try {
        const createdComment = await repository.addComment(
          selectedCommentPostId,
          trimmed,
          image,
          audio,
        );
        const resolvedComment: ReelComment = image
          ? {
              ...createdComment,
              imageWidth: createdComment.imageWidth ?? image.width,
              imageHeight: createdComment.imageHeight ?? image.height,
            }
          : createdComment;
        // Replace the temp comment with the actual one from server
        setComments(prev =>
          prev.map(c => (c.id === tempId ? resolvedComment : c)),
        );
        return resolvedComment;
      } catch (caught) {
        // Mark as failed in comments list
        setComments(prev =>
          prev.map(c =>
            c.id === tempId
              ? { ...c, isSending: false, isFailed: true }
              : c,
          ),
        );
        // Rollback the post's commentCount change
        setItems(prev =>
          prev.map(item =>
            item.id === selectedCommentPostId
              ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
              : item,
          ),
        );
        setCommentError(
          caught instanceof Error
            ? caught.message
            : 'Không gửi được bình luận.',
        );
        return null;
      }
    },
    [selectedCommentPostId, getFallbackPublisher],
  );

  // ── Comment actions (like / delete / edit) ───────────────────────────
  //
  // Each runs optimistically: flip the local state immediately, then call
  // the API. On failure, restore the original state. This matches the
  // pattern used for post-level like / save / reaction.
  //
  // A small helper rebuilds the comments OR repliesById slice depending on
  // where the target comment lives — top-level vs reply doesn't change the
  // API contract (same comment_id field) but the local data structures
  // differ. We try comments first, fall back to scanning repliesById.

  /** Apply a transform to whichever bucket (top-level OR replies) holds the comment. */
  const applyToComment = useCallback(
    (
      commentId: string,
      transform: (comment: ReelComment) => ReelComment | null,
    ) => {
      // Top-level pass
      setComments(prev => {
        let touched = false;
        const next: ReelComment[] = [];
        for (const c of prev) {
          if (c.id === commentId) {
            const replaced = transform(c);
            touched = true;
            if (replaced !== null) next.push(replaced);
            // null = delete: skip
          } else {
            next.push(c);
          }
        }
        return touched ? next : prev;
      });

      // Replies pass — at most one bucket will own this id
      setRepliesById(prev => {
        let touched = false;
        const next: Record<string, ReelComment[]> = {};
        for (const [parentId, replies] of Object.entries(prev)) {
          let bucketTouched = false;
          const nextReplies: ReelComment[] = [];
          for (const r of replies) {
            if (r.id === commentId) {
              const replaced = transform(r);
              bucketTouched = true;
              touched = true;
              if (replaced !== null) nextReplies.push(replaced);
            } else {
              nextReplies.push(r);
            }
          }
          next[parentId] = bucketTouched ? nextReplies : replies;
        }
        return touched ? next : prev;
      });
    },
    [],
  );

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      let snapshot: ReelComment | undefined;
      applyToComment(commentId, comment => {
        snapshot = comment;
        const willLike = !comment.isLiked;
        return {
          ...comment,
          isLiked: willLike,
          likeCount: Math.max(0, comment.likeCount + (willLike ? 1 : -1)),
        };
      });

      try {
        await repository.toggleCommentLike(commentId);
      } catch {
        if (snapshot) {
          const original = snapshot;
          applyToComment(commentId, () => original);
        }
      }
    },
    [applyToComment],
  );

  /**
   * Set / swap / clear the viewer's reaction on a comment — Facebook-style.
   *
   * Semantics (same as `toggleReaction` for posts):
   *   • No reaction yet  + nextReaction='like' → adds 'like'
   *   • Has 'like'       + nextReaction='like' → clears (toggles off)
   *   • Has 'like'       + nextReaction='love' → swaps to 'love'
   *
   * Likes count is adjusted client-side: ±1 at the null boundary,
   * 0 when swapping between two non-null reactions.
   */
  const setCommentReaction = useCallback(
    async (commentId: string, nextReaction: ReactionType) => {
      let snapshot: ReelComment | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      applyToComment(commentId, comment => {
        snapshot = comment;
        const willClear = comment.myReaction === nextReaction;
        targetReaction = willClear ? null : nextReaction;

        const wasReacted = comment.myReaction !== null;
        const willBeReacted = targetReaction !== null;
        const countDelta = Number(willBeReacted) - Number(wasReacted);

        return {
          ...comment,
          myReaction: targetReaction,
          isLiked: willBeReacted,
          likeCount: Math.max(0, comment.likeCount + countDelta),
        };
      });

      try {
        await repository.setCommentReaction(commentId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          applyToComment(commentId, () => original);
        }
      }
    },
    [applyToComment],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Snapshot so we can restore on error. We also need to know whether
      // this was a top-level comment (so we can decrement the parent
      // post's commentCount) or a reply (don't decrement — comment-on-post
      // count doesn't include replies in WoWonder's data model).
      let snapshot: ReelComment | undefined;
      let wasTopLevel = false;
      let parentReplyId: string | null = null;

      setComments(prev => {
        const idx = prev.findIndex(c => c.id === commentId);
        if (idx === -1) return prev;
        snapshot = prev[idx];
        wasTopLevel = true;
        return prev.filter(c => c.id !== commentId);
      });

      if (!snapshot) {
        setRepliesById(prev => {
          const next: Record<string, ReelComment[]> = { ...prev };
          for (const [parentId, replies] of Object.entries(prev)) {
            const idx = replies.findIndex(r => r.id === commentId);
            if (idx !== -1) {
              snapshot = replies[idx];
              parentReplyId = parentId;
              next[parentId] = replies.filter(r => r.id !== commentId);
              break;
            }
          }
          return snapshot ? next : prev;
        });
      }

      if (!snapshot) return; // not found locally — nothing to do

      // Decrement parent post comment count for top-level deletions, OR
      // decrement parent comment's replyCount for reply deletions.
      if (wasTopLevel && selectedCommentPostId) {
        setItems(prev =>
          prev.map(item =>
            item.id === selectedCommentPostId
              ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
              : item,
          ),
        );
      } else if (parentReplyId) {
        const parentId = parentReplyId;
        setComments(prev =>
          prev.map(c =>
            c.id === parentId
              ? { ...c, replyCount: Math.max(0, c.replyCount - 1) }
              : c,
          ),
        );
      }

      try {
        await repository.deleteComment(commentId);
      } catch {
        // Restore the snapshot — easier to re-insert at the end than to
        // remember the original position; users rarely notice the order
        // change for a failed delete.
        const restored = snapshot;
        if (wasTopLevel) {
          setComments(prev => [...prev, restored]);
          if (selectedCommentPostId) {
            setItems(prev =>
              prev.map(item =>
                item.id === selectedCommentPostId
                  ? { ...item, commentCount: item.commentCount + 1 }
                  : item,
              ),
            );
          }
        } else if (parentReplyId) {
          const parentId = parentReplyId;
          setRepliesById(prev => ({
            ...prev,
            [parentId]: [...(prev[parentId] ?? []), restored],
          }));
          setComments(prev =>
            prev.map(c =>
              c.id === parentId
                ? { ...c, replyCount: c.replyCount + 1 }
                : c,
            ),
          );
        }
      }
    },
    [selectedCommentPostId],
  );

  const editComment = useCallback(
    async (commentId: string, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) return;

      let snapshot: ReelComment | undefined;
      applyToComment(commentId, comment => {
        snapshot = comment;
        return { ...comment, text: trimmed };
      });

      try {
        await repository.editComment(commentId, trimmed);
      } catch {
        if (snapshot) {
          const original = snapshot;
          applyToComment(commentId, () => original);
        }
      }
    },
    [applyToComment],
  );

  // ── Replies ──────────────────────────────────────────────────────────
  //
  // `loadReplies` is split into a single function that handles both the
  // first page (offset 0) and subsequent pages. The caller checks
  // `repliesById[commentId]` to know whether it's an expansion or a
  // load-more. Pagination is comment-id-cursored: the highest id from the
  // previous page becomes the next `offset`.

  const loadReplies = useCallback(async (commentId: string) => {
    if (loadingRepliesIds.includes(commentId)) return;

    setLoadingRepliesIds(prev => [...prev, commentId]);
    try {
      const offset = replyOffsetsRef.current[commentId] ?? 0;
      const fresh = await repository.fetchReplies(commentId, {
        limit: COMMENT_PAGE_SIZE,
        offset,
      });
      setRepliesById(prev => {
        const existing = prev[commentId] ?? [];
        const seen = new Set(existing.map(r => r.id));
        const novel = fresh.filter(r => !seen.has(r.id));
        return { ...prev, [commentId]: [...existing, ...novel] };
      });
      const lastReply = fresh[fresh.length - 1];
      if (lastReply) {
        replyOffsetsRef.current[commentId] =
          Number(lastReply.id) || replyOffsetsRef.current[commentId] || 0;
      } else if (offset === 0) {
        // First-page load returned nothing — still mark as expanded with
        // an empty array so the UI shows "no replies" instead of looping.
        setRepliesById(prev => ({ ...prev, [commentId]: prev[commentId] ?? [] }));
      }
    } catch {
      // Soft fail — leave the existing replies in place. The UI will show
      // whatever's already there, including empty if this was the first load.
    } finally {
      setLoadingRepliesIds(prev => prev.filter(id => id !== commentId));
    }
  }, [loadingRepliesIds]);

  const collapseReplies = useCallback((commentId: string) => {
    setRepliesById(prev => {
      if (!(commentId in prev)) return prev;
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    delete replyOffsetsRef.current[commentId];
  }, []);

  const startReplyTo = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo({ commentId, username });
    },
    [],
  );

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const submitReply = useCallback(
    async (
      commentId: string,
      text: string,
      image?: CommentImageAttachment,
    ) => {
      const trimmed = text.trim();
      // Text OR image required.
      if (!commentId || (!trimmed && !image)) return null;

      const tempId = `temp-${Date.now()}`;
      const publisher = getFallbackPublisher();
      const newReply: ReelComment = {
        id: tempId,
        text: trimmed,
        postedAt: Math.floor(Date.now() / 1000),
        publisher,
        likeCount: 0,
        replyCount: 0,
        isLiked: false,
        myReaction: null,
        owner: true,
        postOwner: false,
        isSending: true,
        pendingImageUri: image?.uri,
        imageWidth: image?.width,
        imageHeight: image?.height,
      };

      // Add the optimistic reply instantly
      setRepliesById(prev => ({
        ...prev,
        [commentId]: [...(prev[commentId] ?? []), newReply],
      }));

      // Bump the parent comment's reply count so the "Xem N phản hồi"
      // label reflects reality without re-fetching.
      setComments(prev =>
        prev.map(c =>
          c.id === commentId ? { ...c, replyCount: c.replyCount + 1 } : c,
        ),
      );

      // Reply mode auto-exits on success — TikTok/Facebook behaviour.
      setReplyingTo(null);

      try {
        const created = await repository.addReply(commentId, trimmed, image);
        const resolvedReply: ReelComment = image
          ? {
              ...created,
              imageWidth: created.imageWidth ?? image.width,
              imageHeight: created.imageHeight ?? image.height,
            }
          : created;
        // Replace temp reply with the actual one from server
        setRepliesById(prev => ({
          ...prev,
          [commentId]: (prev[commentId] ?? []).map(r =>
            r.id === tempId ? resolvedReply : r,
          ),
        }));

        // Move the reply cursor past this new id so a subsequent load-more
        // doesn't refetch this same reply.
        replyOffsetsRef.current[commentId] = Math.max(
          replyOffsetsRef.current[commentId] ?? 0,
          Number(resolvedReply.id) || 0,
        );

        return resolvedReply;
      } catch (caught) {
        // Mark as failed in replies list
        setRepliesById(prev => ({
          ...prev,
          [commentId]: (prev[commentId] ?? []).map(r =>
            r.id === tempId ? { ...r, isSending: false, isFailed: true } : r,
          ),
        }));
        // Decrement the parent comment's reply count
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, replyCount: Math.max(0, c.replyCount - 1) } : c,
          ),
        );
        setCommentError(
          caught instanceof Error
            ? caught.message
            : 'Không gửi được phản hồi.',
        );
        return null;
      }
    },
    [getFallbackPublisher],
  );

  const retryFailedComment = useCallback((comment: ReelComment) => {
    // Re-pack the cached local URI as a CommentImageAttachment so the
    // retry submission carries the original image through. The file://
    // URI from the picker stays valid until app restart.
    const retryImage: CommentImageAttachment | undefined = comment.pendingImageUri
      ? {
          uri: comment.pendingImageUri,
          name: `retry-${Date.now()}.jpg`,
          type: 'image/jpeg',
        }
      : undefined;
    const retryAudio: CommentAudioAttachment | undefined = comment.pendingAudioUri
      ? {
          uri: comment.pendingAudioUri,
          name: `retry-${Date.now()}.mp3`,
          type: 'audio/mpeg',
        }
      : undefined;

    if (comments.some(c => c.id === comment.id)) {
      setComments(prev => prev.filter(c => c.id !== comment.id));
      submitComment(comment.text, retryImage, retryAudio);
    } else {
      let parentId: string | null = null;
      for (const [pId, replies] of Object.entries(repliesById)) {
        if (replies.some(r => r.id === comment.id)) {
          parentId = pId;
          break;
        }
      }
      if (parentId) {
        const pId = parentId;
        setRepliesById(prev => ({
          ...prev,
          [pId]: (prev[pId] ?? []).filter(r => r.id !== comment.id),
        }));
        setComments(prev =>
          prev.map(c =>
            c.id === pId ? { ...c, replyCount: Math.max(0, c.replyCount - 1) } : c,
          ),
        );
        submitReply(pId, comment.text, retryImage);
      }
    }
  }, [comments, repliesById, submitComment, submitReply]);

  const deleteFailedComment = useCallback((comment: ReelComment) => {
    if (comments.some(c => c.id === comment.id)) {
      setComments(prev => prev.filter(c => c.id !== comment.id));
    } else {
      for (const [parentId, replies] of Object.entries(repliesById)) {
        if (replies.some(r => r.id === comment.id)) {
          setRepliesById(prev => ({
            ...prev,
            [parentId]: (prev[parentId] ?? []).filter(r => r.id !== comment.id),
          }));
          break;
        }
      }
    }
  }, [comments, repliesById]);

  // Set initial video (when clicked from Feed screen)
  const setInitialVideo = useCallback((id: string, post: FeedVideoPost) => {
    initialVideoInfoRef.current = { id, post };
    setItems(prev => {
      if (prev.length === 0) {
        return [mapFeedVideoToReel(post)];
      }
      const index = prev.findIndex(item => String(item.id) === String(id));
      let nextList = [...prev];
      if (index === -1) {
        const mapped = mapFeedVideoToReel(post);
        nextList = [mapped, ...prev];
      }
      
      const targetIdx = nextList.findIndex(item => String(item.id) === String(id));
      setActiveIndex(targetIdx !== -1 ? targetIdx : 0);
      return nextList;
    });
  }, []);

  const followPublisher = useCallback(async (publisherId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.publisher.userId === publisherId
          ? { ...item, publisher: { ...item.publisher, isFollowing: true } }
          : item,
      ),
    );
    try {
      await apiBridge.post(apiRoutes.social.follow, { user_id: publisherId });
    } catch (err) {
      console.error('[Reels] Failed to follow user:', err);
      setItems(prev =>
        prev.map(item =>
          item.publisher.userId === publisherId
            ? { ...item, publisher: { ...item.publisher, isFollowing: false } }
            : item,
        ),
      );
    }
  }, []);

  const sharePost = useCallback((input: SharePostInput) => {
    return feedRepository.sharePost(input);
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    items,
    isInitialLoading: phase === 'initial' && items.length === 0,
    isRefreshing: phase === 'refreshing',
    isLoadingMore: phase === 'loading-more',
    hasMore,
    error,
    activeIndex,
    selectedCommentPostId,
    comments,
    commentError,
    isCommentsOpen: selectedCommentPostId !== null,
    isCommentsLoading: commentPhase === 'loading',
    isCommentsLoadingMore: commentPhase === 'loading-more',
    isSubmittingComment: commentPhase === 'submitting',
    hasMoreComments,
    // Reply state
    repliesById,
    loadingRepliesIds,
    replyingTo,
    setActiveIndex,
    setInitialVideo,
    peekLatestReels,
    prependReels,
    refresh,
    loadMore,
    retry: loadInitial,
    toggleLike,
    toggleReaction,
    toggleSave,
    markUnavailable,
    openComments,
    closeComments,
    loadMoreComments,
    submitComment,
    // Comment actions
    toggleCommentLike,
    setCommentReaction,
    deleteComment,
    editComment,
    // Replies
    loadReplies,
    collapseReplies,
    startReplyTo,
    cancelReply,
    submitReply,
    // Failed actions
    retryFailedComment,
    deleteFailedComment,
    followPublisher,
    sharePost,
  };
}
