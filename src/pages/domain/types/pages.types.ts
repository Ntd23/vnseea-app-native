// Description: Defines page domain models, list filters, and create/edit draft data.

export interface PagesItem {
  id: string | number;
  pageId: string;
  pageName: string;
  pageTitle: string;
  pageDescription?: string;
  pageCategory?: string;
  company?: string;
  phone?: string;
  website?: string;
  address?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  mapPinStatus?: 'none' | 'pending' | 'approved' | 'rejected' | string;
  mapPinRequested?: boolean;
  mapPinApproved?: boolean;
  avatar?: string;
  cover?: string;
  url?: string;
  likes?: number;
  followersCount?: number;
  postCount?: number;
  ratingCount?: number;
  ratingAverage?: number;
  isFollowing?: boolean;
  isLiked?: boolean;
  isRated?: boolean;
  verified?: boolean;
  callActionType?: string;
  callActionUrl?: string;
  allowPost?: boolean;
  facebook?: string;
  twitter?: string;
  instgram?: string;
  vk?: string;
  linkedin?: string;
  youtube?: string;
  backgroundImage?: string;
  backgroundImageStatus?: 'defualt' | 'my_background' | string;
  ownerId?: string;
  owner?: PageUser;
  adminInfo?: unknown;
  raw?: unknown;
}

export type PagesFilter = 'mine' | 'suggested' | 'liked';

export interface PagesListOptions {
  limit?: number;
  offset?: string | number | null;
}

export interface PagesListPage {
  items: PagesItem[];
  nextOffset: string | null;
  hasMore: boolean;
}

export interface PageUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isFriend?: boolean;
  isRequested?: boolean;
  isInvited?: boolean;
  role?: 'owner' | 'admin' | string;
  raw?: unknown;
}

export interface PageReview {
  id: string;
  text: string;
  rating: number;
  postedAt?: number;
  user: PageUser | null;
  raw?: unknown;
}

export interface PageReviewsPage {
  items: PageReview[];
  nextOffset: string | null;
  hasMore: boolean;
}

export interface PagePrivileges {
  general: boolean;
  info: boolean;
  social: boolean;
  avatar: boolean;
  design: boolean;
  admins: boolean;
  analytics: boolean;
  delete_page: boolean;
}

export interface CreatePageDraft {
  pageTitle: string;
  pageName: string;
  pageDescription: string;
  pageAddress: string;
  pageCategory: string;
  company?: string;
  phone?: string;
  website?: string;
  pageSubCategory?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  mapPinStatus?: 'none' | 'pending' | 'approved' | 'rejected' | string;
  mapPinRequested?: boolean;
  callActionType?: string;
  callActionUrl?: string;
  allowPost?: boolean;
  verified?: boolean;
  facebook?: string;
  twitter?: string;
  instgram?: string;
  vk?: string;
  linkedin?: string;
  youtube?: string;
  backgroundImageStatus?: 'defualt' | 'my_background' | string;
}
