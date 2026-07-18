// Description: Defines the private post activity center domain models.
import type { ReactionType } from '../../../reels/domain/types/reels.types';

export type ActivityCenterTab = 'saved' | 'reaction' | 'comment' | 'share';
export type ActivityMediaKind = 'text' | 'photo' | 'video';
export type ActivityShareDestination = 'timeline' | 'page' | 'group';

export interface PostActivityItem {
  id: string;
  postId: string;
  category: ActivityCenterTab;
  title: string;
  author: string;
  authorAvatarUrl?: string;
  postedAt?: number;
  imageUrl?: string;
  videoUrl?: string;
  mediaKind: ActivityMediaKind;
  reaction?: ReactionType;
  interactionCount?: number;
  latestCommentText?: string;
  shareDestination?: ActivityShareDestination;
  actionAt?: number;
  rawPost: Record<string, unknown>;
}

export interface PostActivityPage {
  items: PostActivityItem[];
  nextCursor?: string;
  hasMore: boolean;
}
