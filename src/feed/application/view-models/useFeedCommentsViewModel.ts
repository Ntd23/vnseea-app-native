// Description: ViewModel to manage commenting and replying logic for Feed video posts.
// Reuses the WoWonder comment API calls via ApiReelsRepository.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createReelsRepository } from '../../../reels/infrastructure/repositories/ApiReelsRepository';
import { createAuthRepository } from '../../../auth/infrastructure/repositories/ApiAuthRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type {
  CommentAudioAttachment,
  CommentImageAttachment,
  ReactionType,
  ReelComment,
  ReelPublisher,
} from '../../../reels/domain/types/reels.types';

const repository = createReelsRepository();
const COMMENT_PAGE_SIZE = 20;

type CommentPhase = 'idle' | 'loading' | 'loading-more' | 'submitting';

interface UseFeedCommentsViewModelOptions {
  onCommentCountChange?: (postId: string, delta: number) => void;
}

export function useFeedCommentsViewModel({
  onCommentCountChange,
}: UseFeedCommentsViewModelOptions = {}) {
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentPhase, setCommentPhase] = useState<CommentPhase>('idle');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);

  // Current user — for optimistic comment rendering
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

        // Persist to MMKV cache
        sessionStorage.setUserProfile({
          name: profile.name,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        });
      } catch {
        // Network/auth failure is non-fatal
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  // Reply state
  const [repliesById, setRepliesById] = useState<Record<string, ReelComment[]>>({});
  const [loadingRepliesIds, setLoadingRepliesIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  const commentOffsetRef = useRef(0);
  const commentInFlightRef = useRef(false);
  const replyOffsetsRef = useRef<Record<string, number>>({});

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
      const cleanPostId = postId.replace(/_rc\d+_\d+$/, '');
      const nextComments = await repository.getComments(cleanPostId, {
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
    setCommentPhase('loading-more');
    setCommentError(null);

    try {
      const cleanPostId = selectedCommentPostId.replace(/_rc\d+_\d+$/, '');
      const nextComments = await repository.getComments(cleanPostId, {
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

  const submitComment = useCallback(
    async (
      text: string,
      image?: CommentImageAttachment,
      audio?: CommentAudioAttachment,
    ) => {
      const trimmed = text.trim();
      // Allow image-only comments (backend does too) — must have AT LEAST
      // text OR image, not both empty.
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
        // Local file:// URI so the bubble can render the image instantly
        // while the upload is in flight. Swapped out for `imageUrl` (CDN
        // URL) once the server response lands.
        pendingImageUri: image?.uri,
        imageWidth: image?.width,
        imageHeight: image?.height,
        pendingAudioUri: audio?.uri,
      };

      // Add the optimistic comment instantly
      setComments(prev => [...prev, newComment]);

      // Increment count on the post optimistically
      onCommentCountChange?.(selectedCommentPostId, 1);

      try {
        const cleanPostId = selectedCommentPostId.replace(/_rc\d+_\d+$/, '');
        const createdComment = await repository.addComment(
          cleanPostId,
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
        // Mark as failed in comments list (keep `pendingImageUri` so the
        // user can see what they tried to send and retry).
        setComments(prev =>
          prev.map(c =>
            c.id === tempId
              ? { ...c, isSending: false, isFailed: true }
              : c,
          ),
        );
        // Rollback the post's commentCount change
        onCommentCountChange?.(selectedCommentPostId, -1);

        setCommentError(
          caught instanceof Error
            ? caught.message
            : 'Không gửi được bình luận.',
        );
        return null;
      }
    },
    [selectedCommentPostId, getFallbackPublisher, onCommentCountChange],
  );

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
          } else {
            next.push(c);
          }
        }
        return touched ? next : prev;
      });

      // Replies pass
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

      if (!snapshot) return;

      if (wasTopLevel && selectedCommentPostId) {
        onCommentCountChange?.(selectedCommentPostId, -1);
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
        const restored = snapshot;
        if (wasTopLevel) {
          setComments(prev => [...prev, restored]);
          if (selectedCommentPostId) {
            onCommentCountChange?.(selectedCommentPostId, 1);
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
    [selectedCommentPostId, onCommentCountChange],
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
        setRepliesById(prev => ({ ...prev, [commentId]: prev[commentId] ?? [] }));
      }
    } catch {
      // Soft fail — leave existing replies in place
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
      // Same rule as `submitComment` — text OR image is required.
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

      // Bump the parent comment's reply count
      setComments(prev =>
        prev.map(c =>
          c.id === commentId ? { ...c, replyCount: c.replyCount + 1 } : c,
        ),
      );

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
        // Replace temp reply with actual one
        setRepliesById(prev => ({
          ...prev,
          [commentId]: (prev[commentId] ?? []).map(r =>
            r.id === tempId ? resolvedReply : r,
          ),
        }));

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
    // Re-package the cached local URI as a CommentImageAttachment so the
    // retry path is identical to a fresh submit. The local file:// URI
    // from the original picker call is still valid until app restart.
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

  return {
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
  };
}
