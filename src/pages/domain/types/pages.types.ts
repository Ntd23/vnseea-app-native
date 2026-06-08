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
  avatar?: string;
  cover?: string;
  url?: string;
  likes?: number;
  isLiked?: boolean;
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
}
