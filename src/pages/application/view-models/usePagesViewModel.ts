// Description: Coordinates page create and edit form state with the Pages repository.
import { useCallback, useState } from 'react';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type {
  CreatePageDraft,
  PagePrivileges,
  PageUser,
  PagesItem,
} from '../../domain/types/pages.types';
import type { UpdatePageSection } from '../../domain/repositories/PagesRepository';

const repository = createPagesRepository();

function validateCreatePageDraft(draft: CreatePageDraft): string | null {
  const title = draft.pageTitle.trim();
  const name = draft.pageName.trim();
  const description = draft.pageDescription.trim();
  const address = draft.pageAddress.trim();

  if (title.length < 2) {
    return 'Vui lòng nhập tên trang ít nhất 2 ký tự.';
  }

  if (name.length < 5 || name.length > 32) {
    return 'Tên người dùng của trang phải từ 5 đến 32 ký tự.';
  }

  if (!/^[a-z0-9_-]+$/.test(name)) {
    return 'Tên URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.';
  }

  if (description.length < 10 || description.length > 200) {
    return 'Mô tả trang phải từ 10 đến 200 ký tự.';
  }

  if (!address) {
    return 'Vui lòng nhập địa điểm của trang.';
  }

  if (
    draft.lat === undefined ||
    draft.lng === undefined ||
    !Number.isFinite(draft.lat) ||
    !Number.isFinite(draft.lng)
  ) {
    return 'Vui lòng chọn gợi ý hoặc ghim đúng vị trí trên bản đồ.';
  }

  if (!draft.pageCategory) {
    return 'Vui lòng chọn danh mục cho trang.';
  }

  return null;
}

function validateUpdatePageDraft(
  draft: CreatePageDraft,
  section: UpdatePageSection,
): string | null {
  if (section === 'profile') {
    if (
      draft.website &&
      !/^https?:\/\/.+\..+/i.test(draft.website.trim())
    ) {
      return 'Website không hợp lệ.';
    }
    return null;
  }

  if (section === 'social' || section === 'design') {
    return null;
  }

  const title = draft.pageTitle.trim();
  const name = draft.pageName.trim();

  if (title.length < 2) {
    return 'Vui lòng nhập tên trang ít nhất 2 ký tự.';
  }

  if (name.length < 5 || name.length > 32) {
    return 'Trang URL phải từ 5 đến 32 ký tự.';
  }

  if (!/^[a-z0-9_-]+$/.test(name)) {
    return 'Trang URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.';
  }

  if (!draft.pageCategory) {
    return 'Vui lòng chọn danh mục cho trang.';
  }

  if (
    draft.callActionUrl &&
    !/^https?:\/\/.+\..+/i.test(draft.callActionUrl.trim())
  ) {
    return 'Website kêu gọi hành động không hợp lệ.';
  }

  return null;
}

export function usePagesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPage, setCreatedPage] = useState<PagesItem | null>(null);
  const [pageAdmins, setPageAdmins] = useState<PageUser[]>([]);

  const createPage = useCallback(async (draft: CreatePageDraft) => {
    const validationError = validateCreatePageDraft(draft);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setIsCreating(true);
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.createPage({
        ...draft,
        pageTitle: draft.pageTitle.trim(),
        pageName: draft.pageName.trim(),
        pageDescription: draft.pageDescription.trim(),
        pageAddress: draft.pageAddress.trim(),
      });
      setCreatedPage(result.page);
      return result.page;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể tạo trang. Vui lòng thử lại.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  }, []);

  const updatePage = useCallback(
    async (
      pageId: string,
      draft: CreatePageDraft,
      section: UpdatePageSection = 'general',
    ) => {
      const validationError = validateUpdatePageDraft(draft, section);
      if (validationError) {
        setError(validationError);
        return null;
      }

      setIsCreating(true);
      setIsLoading(true);
      setError(null);

      try {
        const result = await repository.updatePage(
          pageId,
          {
            ...draft,
            pageTitle: draft.pageTitle.trim(),
            pageName: draft.pageName.trim(),
            pageDescription: draft.pageDescription.trim(),
            pageAddress: draft.pageAddress.trim(),
            company: draft.company?.trim(),
            phone: draft.phone?.trim(),
            website: draft.website?.trim(),
            callActionUrl: draft.callActionUrl?.trim(),
          },
          section,
        );
        setCreatedPage(result.page);
        return result.page;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật trang. Vui lòng thử lại.';
        setError(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
        setIsLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const deletePage = useCallback(async (pageId: string, password: string) => {
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu.');
      return false;
    }

    setIsCreating(true);
    setIsLoading(true);
    setError(null);
    try {
      await repository.deletePage(pageId, password.trim());
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể xóa trang.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  }, []);

  const updatePageMedia = useCallback(
    async (
      pageId: string,
      field: 'avatar' | 'cover' | 'background_image',
      file: { uri: string; name?: string; type?: string },
    ) => {
      setIsCreating(true);
      setIsLoading(true);
      setError(null);
      try {
        const page = await repository.updatePageMedia(pageId, field, file);
        setCreatedPage(page);
        return page;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể cập nhật ảnh.';
        setError(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
        setIsLoading(false);
      }
    },
    [],
  );

  const loadPageAdmins = useCallback(async (pageId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const admins = await repository.getPageAdmins(pageId);
      setPageAdmins(admins);
      return admins;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ táº£i quáº£n trá»‹ viÃªn.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePagePrivileges = useCallback(
    async (pageId: string, userId: string, privileges: PagePrivileges) => {
      setIsCreating(true);
      setIsLoading(true);
      setError(null);
      try {
        await repository.updatePagePrivileges(pageId, userId, privileges);
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'KhÃ´ng thá»ƒ cáº­p nháº­t quyá»n quáº£n trá»‹.';
        setError(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    isLoading,
    isCreating,
    error,
    createdPage,
    pageAdmins,
    createPage,
    updatePage,
    deletePage,
    updatePageMedia,
    loadPageAdmins,
    updatePagePrivileges,
    clearError,
  };
}
