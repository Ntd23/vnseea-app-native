// Popular Repository Interface

import type { PopularPost } from '../types/popular.types';

export interface PopularRepository {
  getMostLiked(): Promise<PopularPost[]>;
}
