// Description: Defines repository contracts for page listing, creation, and editing.
import type {
  CreatePageDraft,
  PagePrivileges,
  PageReview,
  PageReviewsPage,
  PageUser,
  PagesItem,
  PagesListOptions,
  PagesListPage,
} from '../types/pages.types';

export interface CreatePageResult {
  page: PagesItem;
  message?: string;
}

export type UpdatePageSection =
  | 'core'
  | 'general'
  | 'profile'
  | 'social'
  | 'design';

export interface PagesRepository {
  getMyPages(options?: PagesListOptions): Promise<PagesListPage>;
  getSuggestedPages(options?: PagesListOptions): Promise<PagesListPage>;
  searchPages(
    query: string,
    options?: PagesListOptions,
  ): Promise<PagesListPage>;
  getLikedPages(
    userId: string | number,
    options?: PagesListOptions,
  ): Promise<PagesListPage>;
  getPageDetail(input: {
    pageId?: string | number;
    pageName?: string;
  }): Promise<PagesItem>;
  toggleLikePage(pageId: string | number): Promise<{ isLiked: boolean }>;
  toggleFollowPage(pageId: string | number): Promise<{ isFollowing: boolean }>;
  getPageFollowers(pageId: string | number): Promise<PageUser[]>;
  getPageAdmins(pageId: string | number): Promise<PageUser[]>;
  getPageInviteCandidates(pageId: string | number): Promise<PageUser[]>;
  inviteUserToPage(input: {
    pageId: string | number;
    userId: string | number;
  }): Promise<void>;
  getPageReviews(
    pageId: string | number,
    options?: PagesListOptions,
  ): Promise<PageReviewsPage>;
  ratePage(input: {
    pageId: string | number;
    rating: number;
    text: string;
  }): Promise<PageReview | null>;
  reportPage(input: {
    pageId: string | number;
    text: string;
  }): Promise<void>;
  createPage(draft: CreatePageDraft): Promise<CreatePageResult>;
  updatePage(
    pageId: string,
    draft: CreatePageDraft,
    section?: UpdatePageSection,
  ): Promise<CreatePageResult>;
  updatePageMedia(
    pageId: string,
    field: 'avatar' | 'cover' | 'background_image',
    file: { uri: string; name?: string; type?: string },
  ): Promise<PagesItem>;
  updatePagePrivileges(
    pageId: string,
    userId: string,
    privileges: PagePrivileges,
  ): Promise<void>;
  deletePage(pageId: string, password: string): Promise<void>;
}
