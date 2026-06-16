// Description: Defines page domain models, list filters, and create/edit draft data.

export interface PagesItem {
  id: string | number;
  pageId: string;
  pageName: string;
  pageTitle: string;
  pageDescription?: string;
  pageCategory?: string;
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

export interface CreatePageDraft {
  pageTitle: string;
  pageName: string;
  pageDescription: string;
  pageAddress: string;
  pageCategory: string;
  pageSubCategory?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  mapPinStatus?: 'none' | 'pending' | 'approved' | 'rejected' | string;
  mapPinRequested?: boolean;
}
