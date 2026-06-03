// Popular domain types

import type { UserSummary } from '../../../foundation/domain/types/foundation.types';

export interface PopularPost {
  post_id: string | number;
  user_id: string | number;
  postText: string;
  time: string;
  location: string;
  views: number;
  blur: string;
  feeling: string;
  feeling_color: string;
  postType: string;
  postLink: string;
  postFile: string;
  postFileFallback: string;
  postYoutube: string;
  postVine: string;
  postDailymotion: string;
  postVimeo: string;
  postPlaytube: string;
  postSoundCloud: string;
  age: string;
  postMusic: string;
  postFacebook: string;
  postFileType: string;
  postFileId: string;
  postFileUrl: string;
  albumId: string;
  pollId: string;
  productId: string;
  eventId: string;
  groupId: string;
  pageId: string;
  blogId: string;
  forumId: string;
  threadId: string;
  jobId: string;
  offerId: string;
  fundingId: string;
  donationId: string;
  petitionId: string;
  colorId: string;
  registered: string;
  mode: string;
  stream: string;
  live_time: number;
  live_bg: string;
  product: Record<string, unknown>;
  options: unknown[];
  memory: string;
  time_text: string;
  postMap: string;
  lat: string;
  lng: string;
  publisher: UserSummary;
  getPostComments: unknown[];
  reactions: Record<string, unknown>;
  reactionsCount: { like: number; wow: number; love: number; haha: number; sad: number; angry: number };
  commentsCount: number;
  sharesCount: number;
  boosted: string;
  status: string;
}

export interface PopularItem {
  id: string | number;
  label: string;
  iconKey: string;
  postCount?: number;
}
