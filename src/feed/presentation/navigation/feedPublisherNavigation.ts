import { ROUTES } from '../../../navigation/constants/routes';
import type { FeedPublisher } from '../../domain/types/feed.types';
import { isPageFeedPublisher } from '../../domain/policies/feedPublisherIdentity';

/**
 * Opens a Page publisher and returns true. User publishers are deliberately
 * left to the caller so existing profile-navigation behavior stays intact.
 */
export function navigateToFeedPublisherPage(
  navigation: { navigate: (route: string, params: unknown) => void },
  publisher?: FeedPublisher | null,
): boolean {
  if (!isPageFeedPublisher(publisher)) return false;

  navigation.navigate(ROUTES.PAGE_DETAIL, {
    page: {
      id: publisher.pageId,
      pageId: publisher.pageId,
      pageName: publisher.username,
      pageTitle: publisher.name,
      avatar: publisher.avatarUrl,
      ownerId: publisher.ownerId,
    },
  });
  return true;
}
