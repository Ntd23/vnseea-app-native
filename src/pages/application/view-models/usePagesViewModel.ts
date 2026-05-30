import { useCallback, useState } from 'react';
import { createPagesRepository } from '../../infrastructure/repositories/ApiPagesRepository';
import type { CreatePageDraft, PagesItem } from '../../domain/types/pages.types';

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

  if (!/^[a-z]+$/.test(name)) {
    return 'Tên URL chỉ được dùng chữ cái không dấu, không dùng số, gạch dưới hoặc gạch ngang.';
  }

  if (description.length < 10 || description.length > 200) {
    return 'Mô tả trang phải từ 10 đến 200 ký tự.';
  }

  if (!address) {
    return 'Vui lòng nhập địa điểm của trang.';
  }

  if (!draft.pageCategory) {
    return 'Vui lòng chọn danh mục cho trang.';
  }

  return null;
}

export function usePagesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPage, setCreatedPage] = useState<PagesItem | null>(null);

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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    isCreating,
    error,
    createdPage,
    createPage,
    clearError,
  };
}
