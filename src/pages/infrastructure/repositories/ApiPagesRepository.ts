// Description: Implements page listing, creation, and editing through the API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { PagesRepository } from '../../domain/repositories/PagesRepository';
import type {
  PageReview,
  PageUser,
  PagesItem,
} from '../../domain/types/pages.types';

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

type PageDetailResponse = {
  api_status: number | string;
  page_data?: RawPage;
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type PageActionResponse = {
  api_status: number | string;
  message?: string;
  code?: number | string;
  like_status?: 'liked' | 'unliked' | 'invalid' | string;
  follow_status?: 'followed' | 'unfollowed' | string;
  val?: unknown;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type PageUsersResponse = {
  api_status: number | string;
  data?: RawPage[];
  users?: RawPage[];
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

type PageReviewsResponse = {
  api_status: number | string;
  data?: RawPage[];
  message?: string;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawPage | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function readNumber(raw: RawPage | undefined, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw?.[key];
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return undefined;
}

function readBoolean(
  raw: RawPage | undefined,
  ...keys: string[]
): boolean | undefined {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === '1' || normalized === 'true') return true;
      if (normalized === '0' || normalized === 'false') return false;
    }
  }
  return undefined;
}

function readMapPinStatus(raw: RawPage | undefined) {
  return readString(raw, 'map_pin_status') || readString(raw, 'mapPinStatus');
}

function nextMapPinStatus(draft: {
  mapPinRequested?: boolean;
  mapPinStatus?: string;
}) {
  if (!draft.mapPinRequested) {
    return 'none';
  }
  return draft.mapPinStatus === 'approved' ? 'approved' : 'pending';
}

function mapPinRequestPayload(draft: {
  mapPinRequested?: boolean;
  mapPinStatus?: string;
}) {
  const status = nextMapPinStatus(draft);

  if (status === 'pending') {
    return {
      map_pin_requested: 1,
      map_pin_status: status,
      map_pin_requested_at: Math.floor(Date.now() / 1000),
      map_pin_reviewed_at: 0,
      map_pin_reviewed_by: 0,
    };
  }

  if (status === 'none') {
    return {
      map_pin_requested: 0,
      map_pin_status: status,
      map_pin_requested_at: 0,
      map_pin_reviewed_at: 0,
      map_pin_reviewed_by: 0,
    };
  }

  return {
    map_pin_status: status,
  };
}

function mapPage(raw: RawPage | undefined): PagesItem {
  const pageId = readString(raw, 'page_id') || readString(raw, 'id');
  const pageName = readString(raw, 'page_name') || readString(raw, 'username');
  const pageTitle = readString(raw, 'page_title') || readString(raw, 'name');
  const ownerId = readString(raw, 'user_id', 'owner_id');
  const ownerRaw =
    (raw?.user_data as RawPage | undefined) ??
    (raw?.owner as RawPage | undefined) ??
    (raw?.publisher as RawPage | undefined);
  const mapPinStatus = readMapPinStatus(raw);
  const likes =
    readNumber(raw, 'likes_count', 'likes', 'page_likes', 'like_count') ?? 0;

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
    placeId: readString(raw, 'place_id') || readString(raw, 'placeId'),
    lat: readNumber(raw, 'lat'),
    lng: readNumber(raw, 'lng'),
    mapPinStatus,
    mapPinRequested: mapPinStatus === 'pending' || mapPinStatus === 'approved',
    mapPinApproved: mapPinStatus === 'approved',
    avatar: normalizeUrl(readString(raw, 'avatar')),
    cover: normalizeUrl(readString(raw, 'cover')),
    url:
      normalizeUrl(readString(raw, 'url')) ||
      (pageName ? `${siteRoot}/${pageName}` : ''),
    likes,
    followersCount: readNumber(raw, 'followers_count', 'followers', 'follow_count') ?? likes,
    postCount: readNumber(raw, 'post_count', 'posts_count'),
    ratingCount: readNumber(raw, 'rating_count', 'reviews_count'),
    ratingAverage: readNumber(raw, 'rating', 'rating_average', 'average_rating'),
    isFollowing: readBoolean(raw, 'is_following', 'following'),
    isLiked: readBoolean(raw, 'is_liked'),
    isRated: readBoolean(raw, 'is_rated'),
    ownerId,
    owner:
      mapPageUser(ownerRaw) ??
      (ownerId
        ? {
            id: ownerId,
            name:
              readString(raw, 'owner_name', 'user_name') ||
              readString(ownerRaw, 'name') ||
              'Chủ trang',
            username: readString(raw, 'owner_username'),
            avatarUrl: normalizeUrl(readString(raw, 'owner_avatar')),
            role: 'owner',
          }
        : undefined),
    adminInfo: raw?.admin_info,
    raw,
  };
}

function mapPageUser(raw: RawPage | undefined): PageUser | null {
  const id = readString(raw, 'user_id', 'id');
  if (!id) return null;

  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const username = readString(raw, 'username', 'user_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(raw, 'name', 'full_name') ||
    username ||
    'Người dùng';

  return {
    id,
    name,
    username,
    avatarUrl: normalizeUrl(readString(raw, 'avatar', 'profile_picture')),
    isFriend: readBoolean(raw, 'is_friend'),
    isRequested: readBoolean(raw, 'is_requested'),
    isInvited: readBoolean(raw, 'is_invited'),
    role: readString(raw, 'role'),
    raw,
  };
}

function mapPageReview(raw: RawPage | undefined): PageReview | null {
  const id =
    readString(raw, 'id', 'review_id', 'rate_id') ||
    `${readString(raw, 'page_id')}:${readString(raw, 'user_id')}:${readString(
      raw,
      'time',
    )}`;
  if (!id) return null;

  const userData =
    (raw?.user_data as RawPage | undefined) ??
    (raw?.publisher as RawPage | undefined);

  return {
    id,
    text: readString(raw, 'review', 'text', 'message'),
    rating: readNumber(raw, 'valuation', 'rating', 'rate') ?? 0,
    postedAt: readNumber(raw, 'time', 'posted_at'),
    user: mapPageUser(userData),
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
    return 'Trang URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.';
  }

  if (message.includes('required field')) {
    return 'Backend đang có trường bổ sung bắt buộc cho trang. App cần biết field đó để gửi kèm.';
  }

  if (
    message === '{"api_status":400}' ||
    message.includes('"api_status":400')
  ) {
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

function mapPageDetailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Page not found')) {
    return 'Không tìm thấy trang này.';
  }

  if (message.includes('page_id or page_name')) {
    return 'Thiếu mã trang để tải dữ liệu.';
  }

  return message || 'Không thể tải dữ liệu trang. Vui lòng thử lại.';
}

function assertActionSuccess(
  response: PageActionResponse,
  fallbackMessage: string,
) {
  if (!isSuccess(response.api_status) && Number(response.code) !== 1) {
    throw new Error(
      response.errors?.error_text || response.message || fallbackMessage,
    );
  }
}

function toListPage(
  response: PagesListResponse,
  limit: number,
  paginated = true,
) {
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
    hasMore: paginated && rawPages.length >= limit && Boolean(lastPage?.pageId),
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

    async getPageDetail(input) {
      try {
        const payload = input.pageName
          ? { page_name: input.pageName }
          : { page_id: input.pageId };
        const response = await apiBridge.post<PageDetailResponse>(
          apiRoutes.pages.getById,
          payload,
        );

        if (!isSuccess(response.api_status) || !response.page_data) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thể tải dữ liệu trang. Vui lòng thử lại.',
          );
        }

        return mapPage(response.page_data);
      } catch (error) {
        console.warn('[ApiPagesRepository] get page detail failed', error);
        throw new Error(mapPageDetailError(error));
      }
    },

    async toggleLikePage(pageId) {
      const response = await apiBridge.post<PageActionResponse>(
        apiRoutes.pages.like,
        {
          page_id: pageId,
        },
      );

      assertActionSuccess(response, 'Không thể thích trang. Vui lòng thử lại.');
      return { isLiked: response.like_status === 'liked' };
    },

    async toggleFollowPage(pageId) {
      const response = await apiBridge.post<PageActionResponse>(
        apiRoutes.pages.follow,
        {
          page_id: pageId,
        },
      );

      assertActionSuccess(
        response,
        'Không thể theo dõi trang. Vui lòng thử lại.',
      );
      return { isFollowing: response.follow_status === 'followed' };
    },

    async getPageFollowers(pageId) {
      const response = await apiBridge.post<PageUsersResponse>(
        apiRoutes.pages.followers,
        {
          page_id: pageId,
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải người theo dõi trang.',
        );
      }

      return (response.data ?? []).map(mapPageUser).filter(Boolean) as PageUser[];
    },

    async getPageAdmins(pageId) {
      const response = await apiBridge.post<PageUsersResponse>(
        apiRoutes.pages.admins,
        {
          page_id: pageId,
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải quản trị viên trang.',
        );
      }

      return (response.data ?? [])
        .map(raw => {
          const user = mapPageUser(raw);
          return user ? { ...user, role: user.role || 'admin' } : null;
        })
        .filter(Boolean) as PageUser[];
    },

    async getPageInviteCandidates(pageId) {
      const response = await apiBridge.post<PageUsersResponse>(
        apiRoutes.pages.invites,
        {
          page_id: pageId,
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải danh sách mời.',
        );
      }

      const users = response.data ?? response.users ?? [];
      return users.map(mapPageUser).filter(Boolean) as PageUser[];
    },

    async inviteUserToPage(input) {
      const response = await apiBridge.post<PageActionResponse>(
        apiRoutes.pages.invite,
        {
          page_id: input.pageId,
          user_id: input.userId,
        },
      );

      assertActionSuccess(response, 'Không gửi được lời mời.');
    },

    async getPageReviews(pageId, options = {}) {
      const limit = options.limit ?? 20;
      const offset = options.offset ? String(options.offset) : undefined;
      const response = await apiBridge.post<PageReviewsResponse>(
        apiRoutes.pages.reviews,
        {
          page_id: pageId,
          limit,
          offset,
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải đánh giá trang.',
        );
      }

      const items = (response.data ?? [])
        .map(mapPageReview)
        .filter(Boolean) as PageReview[];
      const lastReview = items[items.length - 1];

      return {
        items,
        nextOffset: lastReview?.id ?? null,
        hasMore: items.length >= limit && Boolean(lastReview?.id),
      };
    },

    async ratePage(input) {
      const response = await apiBridge.post<PageActionResponse>(
        apiRoutes.pages.rate,
        {
          page_id: input.pageId,
          val: input.rating,
          text: input.text,
        },
      );

      assertActionSuccess(response, 'Không gửi được đánh giá trang.');
      return null;
    },

    async reportPage(input) {
      const response = await apiBridge.post<PageActionResponse>(
        apiRoutes.pages.report,
        {
          page_id: input.pageId,
          text: input.text,
        },
      );

      assertActionSuccess(response, 'Không gửi được báo cáo trang.');
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

      if ((draft.pageAddress.trim() || draft.mapPinRequested) && page.pageId) {
        try {
          const updateResponse = await apiBridge.post<UpdatePageResponse>(
            apiRoutes.pages.update,
            {
              page_id: page.pageId,
              address: draft.pageAddress,
              place_id: draft.placeId,
              lat: draft.lat,
              lng: draft.lng,
              ...mapPinRequestPayload(draft),
            },
          );

          if (!isSuccess(updateResponse.api_status)) {
            throw new Error(
              updateResponse.errors?.error_text ||
                updateResponse.message ||
                'Không thể gửi yêu cầu ghim bản đồ.',
            );
          }

          page.address = draft.pageAddress;
          page.placeId = draft.placeId;
          page.lat = draft.lat;
          page.lng = draft.lng;
          page.mapPinStatus = nextMapPinStatus(draft);
          page.mapPinRequested = draft.mapPinRequested;
          page.mapPinApproved = page.mapPinStatus === 'approved';
        } catch (error) {
          console.warn(
            '[ApiPagesRepository] update page address or map pin failed',
            error,
          );
          throw new Error(mapCreatePageError(error));
        }
      }

      return {
        page,
        message: response.message,
      };
    },

    async updatePage(pageId, draft) {
      let response: UpdatePageResponse;

      try {
        response = await apiBridge.post<UpdatePageResponse>(
          apiRoutes.pages.update,
          {
            page_id: pageId,
            page_name: draft.pageName,
            page_title: draft.pageTitle,
            page_description: draft.pageDescription,
            address: draft.pageAddress,
            place_id: draft.placeId,
            lat: draft.lat,
            lng: draft.lng,
            ...mapPinRequestPayload(draft),
            page_category: draft.pageCategory,
            page_sub_category: draft.pageSubCategory,
          },
        );
      } catch (error) {
        console.warn('[ApiPagesRepository] update page failed', error);
        throw new Error(mapCreatePageError(error));
      }

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể cập nhật trang. Vui lòng thử lại.',
        );
      }

      return {
        page: {
          id: pageId,
          pageId,
          pageName: draft.pageName,
          pageTitle: draft.pageTitle,
          pageDescription: draft.pageDescription,
          pageCategory: draft.pageCategory,
          address: draft.pageAddress,
          placeId: draft.placeId,
          lat: draft.lat,
          lng: draft.lng,
          mapPinStatus: nextMapPinStatus(draft),
          mapPinRequested: draft.mapPinRequested,
          mapPinApproved: nextMapPinStatus(draft) === 'approved',
        },
        message: response.message,
      };
    },

    async updatePageMedia(pageId, field, file) {
      try {
        const response = await apiBridge.multipart<UpdatePageResponse>(
          apiRoutes.pages.update,
          {
            page_id: String(pageId),
            [field]: {
              uri: file.uri,
              name: file.name || `${field}_${Date.now()}.jpg`,
              type: file.type || 'image/jpeg',
            },
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              `Không thể cập nhật ${field === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} trang.`,
          );
        }

        // Re-fetch page detail to get the updated media URLs
        const updatedPage = await apiBridge.post<PageDetailResponse>(
          apiRoutes.pages.getById,
          { page_id: pageId },
        );

        if (isSuccess(updatedPage.api_status) && updatedPage.page_data) {
          return mapPage(updatedPage.page_data);
        }

        // Fallback: return a minimal page with just the id
        return { id: pageId, pageId: String(pageId), pageName: '', pageTitle: '' } as ReturnType<typeof mapPage>;
      } catch (error) {
        console.warn(`[ApiPagesRepository] update page ${field} failed`, error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          message || `Không thể cập nhật ${field === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} trang.`,
        );
      }
    },
  };
}
