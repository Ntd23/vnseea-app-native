import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type {
  PageReview,
  PageUser,
  PagesItem,
} from '../../domain/types/pages.types';

export type PageDetailTab = 'all' | 'photos';

const PAGE_POST_LIMIT = 12;
const PAGE_REVIEW_LIMIT = 20;
const SUGGESTED_PAGE_LIMIT = 4;

const pagesRepository = createPagesRepository();
const feedRepository = createFeedRepository();
const pollRepository = createPollRepository();

function getPageKey(page: PagesItem) {
  return page.pageId || page.pageName || String(page.id);
}

function mergePosts(current: FeedPost[], next: FeedPost[]) {
  const seen = new Set(current.map(post => String(post.id)));
  return [...current, ...next.filter(post => !seen.has(String(post.id)))];
}

function getPollTotalVotes(options: FeedPollPost['options']) {
  return options.reduce((sum, option) => sum + option.optionVotes, 0);
}

function withPageOwner(page: PagesItem, admins: PageUser[]) {
  const owner: PageUser | null =
    page.owner ??
    (page.ownerId
      ? {
          id: page.ownerId,
          name: page.pageTitle || page.pageName || 'Chủ trang',
          username: page.pageName || '',
          avatarUrl: page.avatar,
          role: 'owner',
        }
      : null);

  const merged: PageUser[] = owner ? [{ ...owner, role: 'owner' }, ...admins] : admins;
  const seen = new Set<string>();
  return merged.filter(user => {
    const key = String(user.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function usePageDetailViewModel(initialPage: PagesItem) {
  const initialPageKey = useMemo(() => getPageKey(initialPage), [initialPage]);
  const [page, setPage] = useState<PagesItem>(initialPage);
  const [activeTab, setActiveTab] = useState<PageDetailTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postCursor, setPostCursor] = useState<string | undefined>();
  const [postsReachedEnd, setPostsReachedEnd] = useState(false);
  const [suggestedPages, setSuggestedPages] = useState<PagesItem[]>([]);
  const [followers, setFollowers] = useState<PageUser[]>([]);
  const [admins, setAdmins] = useState<PageUser[]>([]);
  const [reviews, setReviews] = useState<PageReview[]>([]);
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [reviewsHasMore, setReviewsHasMore] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState<PageUser[]>([]);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPostsMore, setIsLoadingPostsMore] = useState(false);
  const [isLoadingReviewsMore, setIsLoadingReviewsMore] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPageId = page.pageId || initialPage.pageId;

  const loadSecondaryData = useCallback(async (targetPage: PagesItem) => {
    const pageId = targetPage.pageId;
    const [followersResult, adminsResult, reviewsResult, suggestedResult] =
      await Promise.allSettled([
        pagesRepository.getPageFollowers(pageId),
        pagesRepository.getPageAdmins(pageId),
        pagesRepository.getPageReviews(pageId, { limit: PAGE_REVIEW_LIMIT }),
        pagesRepository.getSuggestedPages({ limit: SUGGESTED_PAGE_LIMIT }),
      ]);

    if (followersResult.status === 'fulfilled') {
      setFollowers(followersResult.value);
    }
    if (adminsResult.status === 'fulfilled') {
      setAdmins(withPageOwner(targetPage, adminsResult.value));
    } else {
      setAdmins(withPageOwner(targetPage, []));
    }
    if (reviewsResult.status === 'fulfilled') {
      setReviews(reviewsResult.value.items);
      setReviewCursor(reviewsResult.value.nextOffset);
      setReviewsHasMore(reviewsResult.value.hasMore);
    }
    if (suggestedResult.status === 'fulfilled') {
      setSuggestedPages(
        suggestedResult.value.items.filter(
          suggested => String(suggested.pageId) !== String(pageId),
        ),
      );
    }
  }, []);

  const loadPage = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const detail = await pagesRepository.getPageDetail({
          pageId: initialPage.pageId || undefined,
          pageName: initialPage.pageId ? undefined : initialPage.pageName,
        });
        const nextPage = { ...initialPage, ...detail };
        const pageId = detail.pageId || initialPage.pageId;

        setPage(nextPage);

        const postsPage = pageId
          ? await feedRepository.getPagePosts(pageId, PAGE_POST_LIMIT)
          : { posts: [], nextCursor: undefined, reachedEnd: true };

        setPosts(postsPage.posts);
        setPostCursor(postsPage.nextCursor);
        setPostsReachedEnd(postsPage.reachedEnd);

        if (pageId) {
          void loadSecondaryData(nextPage);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu trang. Vui lòng thử lại.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [initialPage.pageId, initialPage.pageName, loadSecondaryData],
  );

  const refresh = useCallback(() => loadPage(true), [loadPage]);

  const loadMorePosts = useCallback(async () => {
    if (
      !currentPageId ||
      !postCursor ||
      postsReachedEnd ||
      isLoading ||
      isRefreshing ||
      isLoadingPostsMore
    ) {
      return;
    }

    setIsLoadingPostsMore(true);
    try {
      const pageResult = await feedRepository.getPagePosts(
        currentPageId,
        PAGE_POST_LIMIT,
        postCursor,
      );
      setPosts(current => mergePosts(current, pageResult.posts));
      setPostCursor(pageResult.nextCursor);
      setPostsReachedEnd(pageResult.reachedEnd);
    } finally {
      setIsLoadingPostsMore(false);
    }
  }, [
    currentPageId,
    isLoading,
    isLoadingPostsMore,
    isRefreshing,
    postCursor,
    postsReachedEnd,
  ]);

  const loadMoreReviews = useCallback(async () => {
    if (
      !currentPageId ||
      !reviewCursor ||
      !reviewsHasMore ||
      isLoadingReviewsMore
    ) {
      return;
    }

    setIsLoadingReviewsMore(true);
    try {
      const pageResult = await pagesRepository.getPageReviews(currentPageId, {
        limit: PAGE_REVIEW_LIMIT,
        offset: reviewCursor,
      });
      setReviews(current => {
        const seen = new Set(current.map(review => review.id));
        return [
          ...current,
          ...pageResult.items.filter(review => !seen.has(review.id)),
        ];
      });
      setReviewCursor(pageResult.nextOffset);
      setReviewsHasMore(pageResult.hasMore);
    } finally {
      setIsLoadingReviewsMore(false);
    }
  }, [currentPageId, isLoadingReviewsMore, reviewCursor, reviewsHasMore]);

  const toggleLike = useCallback(async () => {
    if (!currentPageId || isActionLoading) return;

    const previous = page;
    const nextLiked = !page.isLiked;
    setPage(current => ({
      ...current,
      isLiked: nextLiked,
      likes: Math.max(0, (current.likes ?? 0) + (nextLiked ? 1 : -1)),
    }));

    setIsActionLoading(true);
    try {
      const result = await pagesRepository.toggleLikePage(currentPageId);
      let isFollowing = previous.isFollowing;

      // Liking a page from any page surface also starts following it. This
      // keeps the recommendation action consistent with the page hero.
      if (result.isLiked && !previous.isFollowing) {
        try {
          const followResult = await pagesRepository.toggleFollowPage(currentPageId);
          isFollowing = followResult.isFollowing;
        } catch {
          // Preserve the successful like when the follow request is unavailable.
        }
      }

      setPage(current => ({
        ...current,
        isLiked: result.isLiked,
        isFollowing,
        likes: Math.max(
          0,
          (previous.likes ?? current.likes ?? 0) +
            (result.isLiked === previous.isLiked ? 0 : result.isLiked ? 1 : -1),
        ),
      }));
    } catch (err) {
      setPage(previous);
      setError(
        err instanceof Error ? err.message : 'Không thể thích trang này.',
      );
    } finally {
      setIsActionLoading(false);
    }
  }, [currentPageId, isActionLoading, page]);

  const toggleFollow = useCallback(async () => {
    if (!currentPageId || isActionLoading) return;

    const previous = page;
    const nextFollowing = !page.isFollowing;
    setPage(current => ({
      ...current,
      isFollowing: nextFollowing,
      followersCount: Math.max(
        0,
        (current.followersCount ?? 0) + (nextFollowing ? 1 : -1),
      ),
    }));

    setIsActionLoading(true);
    try {
      const result = await pagesRepository.toggleFollowPage(currentPageId);
      setPage(current => ({
        ...current,
        isFollowing: result.isFollowing,
        followersCount: Math.max(
          0,
          (previous.followersCount ?? current.followersCount ?? 0) +
            (result.isFollowing === previous.isFollowing
              ? 0
              : result.isFollowing
                ? 1
                : -1),
        ),
      }));
    } catch (err) {
      setPage(previous);
      setError(
        err instanceof Error ? err.message : 'Không thể theo dõi trang này.',
      );
    } finally {
      setIsActionLoading(false);
    }
  }, [currentPageId, isActionLoading, page]);

  const loadInviteCandidates = useCallback(async () => {
    if (!currentPageId) return;

    setIsLoadingInvites(true);
    try {
      const users = await pagesRepository.getPageInviteCandidates(currentPageId);
      setInviteCandidates(users);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải danh sách mời.',
      );
    } finally {
      setIsLoadingInvites(false);
    }
  }, [currentPageId]);

  const inviteUser = useCallback(
    async (userId: string) => {
      if (!currentPageId) return;
      await pagesRepository.inviteUserToPage({
        pageId: currentPageId,
        userId,
      });
      setInvitedUserIds(current => new Set(current).add(String(userId)));
    },
    [currentPageId],
  );

  const ratePage = useCallback(
    async (rating: number, text: string) => {
      if (!currentPageId) return;
      await pagesRepository.ratePage({ pageId: currentPageId, rating, text });
      const nextReviews = await pagesRepository.getPageReviews(currentPageId, {
        limit: PAGE_REVIEW_LIMIT,
      });
      setReviews(nextReviews.items);
      setReviewCursor(nextReviews.nextOffset);
      setReviewsHasMore(nextReviews.hasMore);
      setPage(current => ({ ...current, isRated: true }));
    },
    [currentPageId],
  );

  const updatePostCommentCount = useCallback((postId: string, delta: number) => {
    setPosts(current =>
      current.map(post => {
        if (post.id !== postId) return post;
        if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
          return post;
        }
        const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
        return {
          ...post,
          commentCount: Math.max(0, typedPost.commentCount + delta),
        };
      }),
    );
  }, []);

  const updatePostById = useCallback(
    (
      postId: string,
      updater: (post: FeedPost) => FeedPost,
    ) => {
      setPosts(current =>
        current.map(post => (post.id === postId ? updater(post) : post)),
      );
    },
    [],
  );

  const editPost = useCallback(
    async (postId: string, text: string) => {
      const target = posts.find(post => post.id === postId);
      if (!target) return;
      if (target.kind !== 'text' && target.kind !== 'video' && target.kind !== 'poll') {
        return;
      }

      await feedRepository.editPost(postId, {
        text,
        privacy: target.privacy,
      });
      updatePostById(postId, post => ({
        ...post,
        caption: text,
      }));
    },
    [posts, updatePostById],
  );

  const deletePost = useCallback(async (postId: string) => {
    const result = await feedRepository.deletePost(postId);
    if (!result.deleted) {
      throw new Error('Không xóa được bài viết.');
    }
    setPosts(current => current.filter(post => post.id !== postId));
    setPage(current => ({
      ...current,
      postCount: Math.max(0, (current.postCount ?? 0) - 1),
    }));
  }, []);

  const togglePostComments = useCallback(async (postId: string) => {
    return feedRepository.togglePostComments(postId);
  }, []);

  const pinPost = useCallback(
    async (postId: string) => {
      if (!currentPageId) {
        throw new Error('Không tìm thấy trang để ghim bài viết.');
      }

      const result = await feedRepository.pinPost(postId, {
        type: 'page',
        ownerId: String(currentPageId),
      });

      if (result.pinned) {
        setPosts(current => {
          const pinnedPost = current.find(post => post.id === postId);
          if (!pinnedPost) {
            return current;
          }
          return [pinnedPost, ...current.filter(post => post.id !== postId)];
        });
      }

      return result;
    },
    [currentPageId],
  );

  const togglePostReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      setPosts(current =>
        current.map(post => {
          if (post.id !== postId) return post;
          if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
            return post;
          }

          snapshot = post;
          const typedPost = post as FeedTextPost | FeedVideoPost | FeedPollPost;
          const willClear = typedPost.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;
          const wasReacted = typedPost.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);
          const prevReaction = typedPost.myReaction;
          let topReactions = [...typedPost.topReactions];

          if (!prevReaction && typedPost.likeCount <= 0) {
            topReactions = [];
          }
          if (prevReaction && prevReaction !== targetReaction) {
            topReactions = topReactions.filter(type => type !== prevReaction);
          }
          if (targetReaction && !topReactions.includes(targetReaction)) {
            topReactions = [targetReaction, ...topReactions].slice(0, 3);
          }

          const likeCount = Math.max(0, typedPost.likeCount + countDelta);
          if (likeCount === 0) {
            topReactions = [];
          }

          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount,
            topReactions,
          };
        }),
      );

      try {
        await feedRepository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setPosts(current =>
            current.map(post => (post.id === postId ? original : post)),
          );
        }
      }
    },
    [],
  );

  const votePoll = useCallback(async (postId: string, optionId: string) => {
    let snapshot: FeedPost | undefined;

    setPosts(current =>
      current.map(post => {
        if (post.id !== postId || post.kind !== 'poll') return post;
        snapshot = post;
        const updatedOptions = post.options.map(option => {
          const isVoted = option.id === optionId;
          const wasVoted = post.votedId === option.id;
          let votes = option.optionVotes;
          if (isVoted && !wasVoted) {
            votes += 1;
          } else if (!isVoted && wasVoted) {
            votes = Math.max(0, votes - 1);
          }
          return { ...option, optionVotes: votes, all: votes };
        });
        const totalVotes = getPollTotalVotes(updatedOptions);
        return {
          ...post,
          options: updatedOptions.map(option => {
            const percentage = totalVotes > 0
              ? Math.round((option.optionVotes / totalVotes) * 100)
              : 0;
            return {
              ...option,
              all: totalVotes,
              percentage: `${percentage}%`,
              percentageNum: percentage,
            };
          }),
          votedId: optionId,
          totalVotes,
        };
      }),
    );

    try {
      const response = await pollRepository.votePoll(optionId);
      setPosts(current =>
        current.map(post => {
          if (post.id !== postId || post.kind !== 'poll') return post;
          return {
            ...post,
            options: response.options,
            votedId: optionId,
            totalVotes: getPollTotalVotes(response.options),
          };
        }),
      );
    } catch {
      if (snapshot) {
        const original = snapshot;
        setPosts(current =>
          current.map(post => (post.id === postId ? original : post)),
        );
      }
    }
  }, []);

  const reportPage = useCallback(
    async (text: string) => {
      if (!currentPageId) return;
      await pagesRepository.reportPage({ pageId: currentPageId, text });
    },
    [currentPageId],
  );

  const toggleSuggestedPageLike = useCallback(async (pageId: string | number) => {
    const previousPages = suggestedPages;
    const target = suggestedPages.find(
      item => String(item.pageId) === String(pageId),
    );
    if (!target) return;

    const nextLiked = !target.isLiked;
    setSuggestedPages(current =>
      current.map(item =>
        String(item.pageId) === String(pageId)
          ? {
              ...item,
              isLiked: nextLiked,
              likes: Math.max(0, (item.likes ?? 0) + (nextLiked ? 1 : -1)),
            }
          : item,
      ),
    );

    try {
      const result = await pagesRepository.toggleLikePage(pageId);
      let isFollowing = target.isFollowing;
      if (result.isLiked && !target.isFollowing) {
        try {
          const followResult = await pagesRepository.toggleFollowPage(pageId);
          isFollowing = followResult.isFollowing;
        } catch {
          // Preserve the successful like when the follow request is unavailable.
        }
      }

      setSuggestedPages(current =>
        current.map(item =>
          String(item.pageId) === String(pageId)
            ? {
                ...item,
                isLiked: result.isLiked,
                isFollowing,
                likes: Math.max(
                  0,
                  (target.likes ?? item.likes ?? 0) +
                    (result.isLiked === target.isLiked
                      ? 0
                      : result.isLiked
                        ? 1
                        : -1),
                ),
              }
            : item,
        ),
      );
    } catch (err) {
      setSuggestedPages(previousPages);
      setError(
        err instanceof Error ? err.message : 'Không thể thích trang này.',
      );
    }
  }, [suggestedPages]);

  const toggleSuggestedPageFollow = useCallback(
    async (pageId: string | number) => {
      const previousPages = suggestedPages;
      const target = suggestedPages.find(
        item => String(item.pageId) === String(pageId),
      );
      if (!target) return;

      const nextFollowing = !target.isFollowing;
      setSuggestedPages(current =>
        current.map(item =>
          String(item.pageId) === String(pageId)
            ? {
                ...item,
                isFollowing: nextFollowing,
                followersCount: Math.max(
                  0,
                  (item.followersCount ?? 0) + (nextFollowing ? 1 : -1),
                ),
              }
            : item,
        ),
      );

      try {
        const result = await pagesRepository.toggleFollowPage(pageId);
        setSuggestedPages(current =>
          current.map(item =>
            String(item.pageId) === String(pageId)
              ? { ...item, isFollowing: result.isFollowing }
              : item,
          ),
        );
      } catch (err) {
        setSuggestedPages(previousPages);
        setError(
          err instanceof Error ? err.message : 'KhĂ´ng thá»ƒ theo dĂµi trang nĂ y.',
        );
      }
    },
    [suggestedPages],
  );

  const updatePageAvatar = useCallback(
    async (file: { uri: string; name?: string; type?: string }) => {
      if (!currentPageId) return;
      setIsUploadingAvatar(true);
      try {
        const updated = await pagesRepository.updatePageMedia(
          currentPageId,
          'avatar',
          file,
        );
        setPage(current => ({ ...current, avatar: updated.avatar }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật ảnh đại diện trang.',
        );
        throw err;
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [currentPageId],
  );

  const updatePageCover = useCallback(
    async (file: { uri: string; name?: string; type?: string }) => {
      if (!currentPageId) return;
      setIsUploadingCover(true);
      try {
        const updated = await pagesRepository.updatePageMedia(
          currentPageId,
          'cover',
          file,
        );
        setPage(current => ({ ...current, cover: updated.cover }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật ảnh bìa trang.',
        );
        throw err;
      } finally {
        setIsUploadingCover(false);
      }
    },
    [currentPageId],
  );

  useEffect(() => {
    setPage(initialPage);
    setPosts([]);
    setFollowers([]);
    setAdmins([]);
    setReviews([]);
    setSuggestedPages([]);
    setPostCursor(undefined);
    setPostsReachedEnd(false);
    // Reset the post-type filter whenever the page changes so the
    // user lands on the full mixed list, not a stale narrow filter
    // carried over from a different page.
    setSearchQuery('');
    void loadPage(false);
  }, [initialPageKey, initialPage, loadPage]);

  // Pre-compute how many posts fall into each filter bucket so the
  // chips can show counts like "Bài viết (12)" / "Video (5)" without
  // re-counting on every render. We only count when the tab is
  // active so the work doesn't run while the user is on
  // followers/reviews/admins.
  const postCounts = useMemo(() => {
    let photos = 0;
    let videos = 0;
    for (const post of posts) {
      if (post.kind === 'text' && post.photos.length > 0) photos += 1;
      else if (post.kind === 'video') videos += 1;
    }
    return { all: posts.length, photos, videos, music: 0 };
  }, [posts]);

  // Apply the active filter to produce the list the FlatList will
  // render. Falls back to the full list if the filter is 'all'.
  const displayedPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredByTab = posts.filter(post => {
      if (activeTab === 'photos') {
        return post.kind === 'text' && post.photos.length > 0;
      }
      return true;
    });

    if (!normalizedQuery) {
      return filteredByTab;
    }

    return filteredByTab.filter(post => {
      if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
        return false;
      }
      const caption = post.caption ?? '';
      const publisherName = post.publisher?.name ?? '';
      return `${caption} ${publisherName} ${post.id}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeTab, posts, searchQuery]);

  return {
    activeTab,
    admins,
    error,
    followers,
    inviteCandidates,
    invitedUserIds,
    isActionLoading,
    isLoading,
    isLoadingInvites,
    isLoadingPostsMore,
    isLoadingReviewsMore,
    isRefreshing,
    loadInviteCandidates,
    loadMorePosts,
    loadMoreReviews,
    page,
    posts,
    searchQuery,
    setSearchQuery,
    displayedPosts,
    deletePost,
    editPost,
    postCounts,
    pinPost,
    suggestedPages,
    ratePage,
    refresh,
    reportPage,
    reviews,
    reviewsHasMore,
    setActiveTab,
    sharePost: feedRepository.sharePost,
    togglePostComments,
    togglePostReaction,
    updatePostCommentCount,
    applyRealtimePost: (nextPost: FeedPost) => {
      setPosts(current =>
        current.map(post =>
          String(post.id) === String(nextPost.id) ? nextPost : post,
        ),
      );
    },
    removeRealtimePost: (postId: string) => {
      setPosts(current =>
        current.filter(post => String(post.id) !== String(postId)),
      );
    },
    toggleFollow,
    toggleLike,
    toggleSuggestedPageLike,
    toggleSuggestedPageFollow,
    votePoll,
    inviteUser,
    updatePageAvatar,
    updatePageCover,
    isUploadingAvatar,
    isUploadingCover,
  };
}
