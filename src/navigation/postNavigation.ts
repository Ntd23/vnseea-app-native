// Description: Centralizes opening a post detail directly in comment mode.
import { ROUTES } from './constants/routes';
import type { FeedPost } from '../feed/domain/types/feed.types';

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

  navigation.navigate(ROUTES.POST_DETAIL, {
    postId,
    ...(post ? { post } : {}),
    focusComments: true,
  });
}
