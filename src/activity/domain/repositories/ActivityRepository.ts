// Description: Declares the authenticated post activity repository contract.
import type {
  ActivityCenterTab,
  PostActivityPage,
} from '../types/activity.types';

export interface GetPostActivityOptions {
  category: ActivityCenterTab;
  cursor?: string;
  limit?: number;
}

export interface ActivityRepository {
  getPostActivity(options: GetPostActivityOptions): Promise<PostActivityPage>;
}
