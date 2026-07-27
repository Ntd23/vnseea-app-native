// Description: Centralizes opening a post detail directly in comment mode.
import { ROUTES } from './constants/routes';
import type { FeedPost } from '../feed/domain/types/feed.types';
import { prefetchFeedComments } from '../feed/application/feedCommentsCache';

type PostNavigation = {
  navigate: (
    routeName: typeof ROUTES.POST_DETAIL,
    params: {
      postId: string;
      post?: FeedPost;
      focusComments?: boolean;
    },
  ) => void;
};

export function navigateToPostComments(
  navigation: PostNavigation,
  postId: string,
  post?: FeedPost,
) {
  if (!postId) return;

  // Start the first-page request before the native transition begins. The
  // PostDetail comment VM shares the same in-flight promise and will paint
  // from it as soon as the screen mounts.
  prefetchFeedComments(postId).catch(() => undefined);

  navigation.navigate(ROUTES.POST_DETAIL, {
    postId,
    ...(post ? { post } : {}),
    focusComments: true,
  });
}
