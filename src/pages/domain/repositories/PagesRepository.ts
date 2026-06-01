import type {
  CreatePageDraft,
  PagesItem,
  PagesListOptions,
  PagesListPage,
} from '../types/pages.types';

export interface CreatePageResult {
  page: PagesItem;
  message?: string;
}

export interface PagesRepository {
  getMyPages(options?: PagesListOptions): Promise<PagesListPage>;
  getSuggestedPages(options?: PagesListOptions): Promise<PagesListPage>;
  getLikedPages(
    userId: string | number,
    options?: PagesListOptions,
  ): Promise<PagesListPage>;
  createPage(draft: CreatePageDraft): Promise<CreatePageResult>;
}
