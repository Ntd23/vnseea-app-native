// Maps popular API rows through the same canonical mapper used by Feed/Profile.
import { mapFeedPost } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { PopularRepository } from '../../domain/repositories/PopularRepository';

interface MostLikedResponse {
  api_status: number | string;
  data?: Array<Record<string, unknown>>;
  errors?: { error_text?: string };
}

export function createPopularRepository(): PopularRepository {
  return {
    async getMostLiked(): Promise<FeedPost[]> {
      const response = await apiBridge.get<MostLikedResponse>(
        apiRoutes.popular.mostLiked,
      );
      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Không thể tải bài viết phổ biến.',
        );
      }
      return (response.data ?? []).map(raw => mapFeedPost(raw));
    },
  };
}
