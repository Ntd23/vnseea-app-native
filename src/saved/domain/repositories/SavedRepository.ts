// Description: Repository port for saved posts.
import type { SavedItem } from '../types/saved.types';

export interface SavedPostsPage {
  items: SavedItem[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface SavedRepository {
  getSavedPosts(options?: {
    limit?: number;
    afterPostId?: string;
  }): Promise<SavedPostsPage>;
}
