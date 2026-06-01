import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { PagesRepository } from '../../domain/repositories/PagesRepository';
import type { PagesItem } from '../../domain/types/pages.types';

type RawPage = Record<string, unknown>;

type CreatePageResponse = {
  api_status: number | string;
  message?: string;
  page_data?: RawPage;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type UpdatePageResponse = {
  api_status: number | string;
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type PagesListResponse = {
  api_status: number | string;
  data?: RawPage[];
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawPage | undefined, key: string): string {
  const value = raw?.[key];
  return value === undefined || value === null ? '' : String(value);
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function readNumber(raw: RawPage | undefined, key: string): number | undefined {
  const value = raw?.[key];
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readBoolean(raw: RawPage | undefined, key: string): boolean | undefined {
  const value = raw?.[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return undefined;
}

function mapPage(raw: RawPage | undefined): PagesItem {
  const pageId = readString(raw, 'page_id') || readString(raw, 'id');
  const pageName = readString(raw, 'page_name') || readString(raw, 'username');
  const pageTitle = readString(raw, 'page_title') || readString(raw, 'name');

  return {
    id: pageId || pageName || pageTitle,
    pageId,
    pageName,
    pageTitle,
    pageDescription:
      readString(raw, 'page_description') || readString(raw, 'about'),
    pageCategory:
      readString(raw, 'page_category') || readString(raw, 'category'),
    address: readString(raw, 'address'),
    avatar: normalizeUrl(readString(raw, 'avatar')),
    cover: normalizeUrl(readString(raw, 'cover')),
    url:
      normalizeUrl(readString(raw, 'url')) ||
      (pageName ? `${siteRoot}/${pageName}` : ''),
    likes: readNumber(raw, 'likes'),
    isLiked: readBoolean(raw, 'is_liked'),
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapCreatePageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Page name is already exists')) {
    return 'URL trang này đã tồn tại. Vui lòng đổi Trang URL khác.';
  }

  if (message.includes('Page name must be between')) {
    return 'Trang URL phải từ 5 đến 32 ký tự.';
  }

  if (message.includes('Invalid Page name characters')) {
    return 'Trang URL chỉ được dùng chữ cái không dấu, không dùng số, gạch dưới hoặc gạch ngang.';
  }

  if (message.includes('required field')) {
    return 'Backend đang có trường bổ sung bắt buộc cho trang. App cần biết field đó để gửi kèm.';
  }

  if (message === '{"api_status":400}' || message.includes('"api_status":400')) {
    return 'API tạo trang trả lỗi 400 nhưng không gửi chi tiết. Khả năng cao endpoint mobile create-page chưa lưu trường Địa điểm như form web.';
  }

  return message || 'Không thể tạo trang. Vui lòng thử lại.';
}

function mapPagesListError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('type can not be empty')) {
    return 'API danh sách trang thiếu tham số type.';
  }

  if (message.includes('user_id (POST) is missing')) {
    return 'Không tìm thấy tài khoản hiện tại để tải trang đã yêu thích.';
  }

  return message || 'Không thể tải danh sách trang. Vui lòng thử lại.';
}

function toListPage(response: PagesListResponse, limit: number, paginated = true) {
  if (!isSuccess(response.api_status)) {
    throw new Error(
      response.errors?.error_text ||
        response.message ||
        'Không thể tải danh sách trang. Vui lòng thử lại.',
    );
  }

  const rawPages = Array.isArray(response.data) ? response.data : [];
  const items = rawPages
    .map(mapPage)
    .filter(page => page.pageId || page.pageName);
  const lastPage = items[items.length - 1];

  return {
    items,
    nextOffset: paginated ? lastPage?.pageId || null : null,
    hasMore:
      paginated && rawPages.length >= limit && Boolean(lastPage?.pageId),
  };
}

export function createPagesRepository(): PagesRepository {
  return {
    async getMyPages(options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : undefined;

      try {
        const response = await apiBridge.post<PagesListResponse>(
          apiRoutes.pages.getMine,
          {
            type: 'my_pages',
            limit,
            offset,
          },
        );

        return toListPage(response, limit);
      } catch (error) {
        console.warn('[ApiPagesRepository] get my pages failed', error);
        throw new Error(mapPagesListError(error));
      }
    },

    async getSuggestedPages(options = {}) {
      const limit = options.limit ?? 20;

      try {
        const response = await apiBridge.post<PagesListResponse>(
          apiRoutes.pages.recommended,
          {
            type: 'pages',
            limit,
          },
        );

        return toListPage(response, limit, false);
      } catch (error) {
        console.warn('[ApiPagesRepository] get suggested pages failed', error);
        throw new Error(mapPagesListError(error));
      }
    },

    async getLikedPages(userId, options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : undefined;

      try {
        const response = await apiBridge.post<PagesListResponse>(
          apiRoutes.pages.getMine,
          {
            type: 'liked_pages',
            user_id: String(userId),
            limit,
            offset,
          },
        );

        return toListPage(response, limit);
      } catch (error) {
        console.warn('[ApiPagesRepository] get liked pages failed', error);
        throw new Error(mapPagesListError(error));
      }
    },

    async createPage(draft) {
      let response: CreatePageResponse;

      try {
        response = await apiBridge.post<CreatePageResponse>(
          apiRoutes.pages.create,
          {
            page_name: draft.pageName,
            page_title: draft.pageTitle,
            page_description: draft.pageDescription,
            address: draft.pageAddress,
            page_category: draft.pageCategory,
            page_sub_category: draft.pageSubCategory,
          },
        );
      } catch (error) {
        console.warn('[ApiPagesRepository] create page failed', error);
        throw new Error(mapCreatePageError(error));
      }

      console.log('[ApiPagesRepository] create page response', response);

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tạo trang. Vui lòng thử lại.',
        );
      }

      const page = mapPage(response.page_data);

      if (draft.pageAddress.trim() && page.pageId) {
        try {
          const updateResponse = await apiBridge.post<UpdatePageResponse>(
            apiRoutes.pages.update,
            {
              page_id: page.pageId,
              address: draft.pageAddress,
            },
          );

          if (isSuccess(updateResponse.api_status)) {
            page.address = draft.pageAddress;
          }
        } catch (error) {
          console.warn('[ApiPagesRepository] update page address failed', error);
        }
      }

      return {
        page,
        message: response.message,
      };
    },
  };
}
