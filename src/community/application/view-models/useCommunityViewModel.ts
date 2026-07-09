// Description: Provides create and edit group actions for the community screens.
// Port từ: client/src/community/application/view-models/

import { useState, useCallback } from 'react';
import { createCommunityRepository } from '../../infrastructure/repositories/ApiCommunityRepository';
import type {
  CreateGroupDraft,
  GroupItem,
  UpdateGroupDraft,
} from '../../domain/types/community.types';

const repository = createCommunityRepository();

function validateCreateGroupDraft(draft: CreateGroupDraft): string | null {
  const title = draft.groupTitle.trim();
  const name = draft.groupName.trim();
  const about = draft.about.trim();

  if (title.length < 2) {
    return 'Vui lòng nhập tên nhóm ít nhất 2 ký tự.';
  }

  if (name.length < 5 || name.length > 32) {
    return 'URL nhóm phải từ 5 đến 32 ký tự.';
  }

  if (!/^[a-z]+$/.test(name)) {
    return 'URL nhóm chỉ được dùng chữ cái không dấu.';
  }

  if (!about) {
    return 'Vui lòng nhập mô tả nhóm.';
  }

  if (!draft.category) {
    return 'Vui lòng chọn danh mục nhóm.';
  }

  return null;
}

function validateUpdateGroupDraft(draft: UpdateGroupDraft): string | null {
  return validateCreateGroupDraft(draft);
}

export function useCommunityViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<GroupItem | null>(null);

  const createGroup = useCallback(async (draft: CreateGroupDraft) => {
    const validationError = validateCreateGroupDraft(draft);

    if (validationError) {
      setError(validationError);
      return null;
    }

    setIsLoading(true);
    setIsCreating(true);
    setError(null);

    try {
      const result = await repository.createGroup({
        ...draft,
        groupName: draft.groupName.trim(),
        groupTitle: draft.groupTitle.trim(),
        about: draft.about.trim(),
      });
      setCreatedGroup(result.group);
      return result.group;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể tạo nhóm. Vui lòng thử lại.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
      setIsCreating(false);
    }
  }, []);

  const updateGroup = useCallback(async (groupId: string | number, draft: UpdateGroupDraft) => {
    const validationError = validateUpdateGroupDraft(draft);

    if (validationError) {
      setError(validationError);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.updateGroup(groupId, {
        ...draft,
        groupName: draft.groupName.trim(),
        groupTitle: draft.groupTitle.trim(),
        about: draft.about.trim(),
      });
      return result.group;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể cập nhật nhóm. Vui lòng thử lại.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateGroupMedia = useCallback(
    (
      groupId: string | number,
      field: 'avatar' | 'cover',
      file: { uri: string; name?: string; type?: string },
    ) => repository.updateGroupMedia(groupId, field, file),
    [],
  );

  const getGroupMembers = useCallback(
    (groupId: string | number) => repository.getGroupMembers(groupId),
    [],
  );

  const removeGroupMember = useCallback(async (groupId: string | number, userId: string | number) => {
    setIsLoading(true);
    setError(null);

    try {
      await repository.removeGroupMember(groupId, userId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể xóa thành viên khỏi nhóm.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string | number, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await repository.deleteGroup(groupId, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể xóa nhóm. Vui lòng thử lại.';
      setError(message);
      throw new Error(message);
    } finally {
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
    createdGroup,
    createGroup,
    updateGroup,
    updateGroupMedia,
    getGroupMembers,
    removeGroupMember,
    deleteGroup,
    clearError,
  };
}
