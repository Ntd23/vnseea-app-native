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
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';
import type { ReelComment, ReelsItem } from '../../domain/types/reels.types';

const repository = createReelsRepository();

const PAGE_SIZE = 10;
const COMMENT_PAGE_SIZE = 20;

type LoadPhase = 'idle' | 'initial' | 'refreshing' | 'loading-more';
type CommentPhase = 'idle' | 'loading' | 'loading-more' | 'submitting';

export function useReelsViewModel() {
  const [items, setItems] = useState<ReelsItem[]>([]);
  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentPhase, setCommentPhase] = useState<CommentPhase>('idle');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);

  // Cursor + in-flight guard kept in refs so callbacks don't recreate.
  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const commentOffsetRef = useRef(0);
  const commentInFlightRef = useRef(false);

  /** Load the first page (used on mount + when the user explicitly retries). */
  const loadInitial = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPhase('initial');
    setError(null);
    try {
      const page = await repository.fetchReels({ limit: PAGE_SIZE });
      setItems(page.items);
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
      setActiveIndex(0);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không tải được reels.',
      );
    } finally {
      setPhase('idle');
      inFlightRef.current = false;
    }
  }, []);

  /** Pull-to-refresh — replaces the list with a fresh first page. */
  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPhase('refreshing');
    setError(null);
    try {
      const page = await repository.fetchReels({ limit: PAGE_SIZE });
      setItems(page.items);
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
  }, []);

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
        // Dedup by id in case the server returns overlapping items.
        const seen = new Set(prev.map(item => item.id));
        const fresh = page.items.filter(item => !seen.has(item.id));
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
  }, [hasMore]);

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
      await repository.toggleSave(postId);
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
    if (commentInFlightRef.current) return;

    commentInFlightRef.current = true;
    setSelectedCommentPostId(postId);
    setComments([]);
    setHasMoreComments(false);
    setCommentPhase('loading');
    setCommentError(null);
    commentOffsetRef.current = 0;

    try {
      const nextComments = await repository.getComments(postId, {
        limit: COMMENT_PAGE_SIZE,
        offset: 0,
      });
      setComments(nextComments);
      setHasMoreComments(nextComments.length >= COMMENT_PAGE_SIZE);
      const lastComment = nextComments[nextComments.length - 1];
      commentOffsetRef.current = Number(lastComment?.id ?? 0) || 0;
    } catch (caught) {
      setCommentError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được bình luận.',
      );
    } finally {
      setCommentPhase('idle');
      commentInFlightRef.current = false;
    }
  }, []);

  const closeComments = useCallback(() => {
    setSelectedCommentPostId(null);
    setComments([]);
    setCommentError(null);
    setHasMoreComments(false);
    commentOffsetRef.current = 0;
  }, []);

  const loadMoreComments = useCallback(async () => {
    if (!selectedCommentPostId) return;
    if (!hasMoreComments) return;
    if (commentInFlightRef.current) return;

    commentInFlightRef.current = true;
    setCommentPhase('loading-more');
    setCommentError(null);

    try {
      const nextComments = await repository.getComments(selectedCommentPostId, {
        limit: COMMENT_PAGE_SIZE,
        offset: commentOffsetRef.current,
      });
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
      setCommentError(
        caught instanceof Error
          ? caught.message
          : 'Không tải thêm được bình luận.',
      );
    } finally {
      setCommentPhase('idle');
      commentInFlightRef.current = false;
    }
  }, [hasMoreComments, selectedCommentPostId]);

  const submitComment = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!selectedCommentPostId || !trimmed) return null;
    if (commentInFlightRef.current) return null;

    commentInFlightRef.current = true;
    setCommentPhase('submitting');
    setCommentError(null);

    try {
      const createdComment = await repository.addComment(selectedCommentPostId, trimmed);
      setComments(prev => [...prev, createdComment]);
      setItems(prev =>
        prev.map(item =>
          item.id === selectedCommentPostId
            ? { ...item, commentCount: item.commentCount + 1 }
            : item,
        ),
      );
      return createdComment;
    } catch (caught) {
      setCommentError(
        caught instanceof Error
          ? caught.message
          : 'Không gửi được bình luận.',
      );
      return null;
    } finally {
      setCommentPhase('idle');
      commentInFlightRef.current = false;
    }
  }, [selectedCommentPostId]);

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
    setActiveIndex,
    refresh,
    loadMore,
    retry: loadInitial,
    toggleLike,
    toggleSave,
    openComments,
    closeComments,
    loadMoreComments,
    submitComment,
  };
}
