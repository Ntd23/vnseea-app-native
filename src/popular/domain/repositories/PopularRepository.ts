// Popular Repository Interface

import type { FeedPost } from '../../../feed/domain/types/feed.types';

export interface PopularRepository {
  getMostLiked(): Promise<FeedPost[]>;
}
