// Description: Group chat ViewModel
// English description: Coordinates group chat state with the group chat repository.
import { useState, useCallback, useEffect } from 'react';
import { createGroupChatRepository } from '../../infrastructure/repositories/ApiGroupChatRepository';
import type {
  GroupChatItem,
  GroupChatUser,
  CreateGroupChatPayload,
} from '../../domain/types/groupChat.types';

const repository = createGroupChatRepository();

export interface UseGroupChatViewModelResult {
  // State
  groups: GroupChatItem[];
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;

  // Actions
  loadGroups: () => Promise<void>;
  createGroup: (payload: CreateGroupChatPayload) => Promise<GroupChatItem | null>;
  joinGroup: (groupId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  searchUsers: (groupId: number, keyword?: string) => Promise<GroupChatUser[]>;
  addUsersToGroup: (groupId: number, userIds: number[]) => Promise<void>;
  removeUsersFromGroup: (groupId: number, userIds: number[]) => Promise<void>;
}

export function useGroupChatViewModel(): UseGroupChatViewModelResult {
  const [groups, setGroups] = useState<GroupChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getList({ limit: 50 });
      setGroups(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tải danh sách nhóm',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (payload: CreateGroupChatPayload): Promise<GroupChatItem | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await repository.createGroup(payload);
      if (result && result.length > 0) {
        setGroups(prev => [result[0], ...prev]);
        return result[0];
      }
      return null;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Tạo nhóm thất bại',
      );
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const joinGroup = useCallback(async (groupId: number) => {
    try {
      await repository.joinGroup(groupId);
      await loadGroups(); // Refresh list
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Tham gia nhóm thất bại');
    }
  }, [loadGroups]);

  const leaveGroup = useCallback(async (groupId: number) => {
    try {
      await repository.leaveGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Rời nhóm thất bại');
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: number) => {
    try {
      await repository.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Xóa nhóm thất bại');
    }
  }, []);

  const searchUsers = useCallback(async (groupId: number, keyword?: string): Promise<GroupChatUser[]> => {
    try {
      return await repository.searchAddableUsers(groupId, keyword);
    } catch (caughtError) {
      console.error('Search users error:', caughtError);
      return [];
    }
  }, []);

  const addUsersToGroup = useCallback(async (groupId: number, userIds: number[]) => {
    try {
      await repository.addUsers(groupId, userIds);
      await loadGroups(); // Refresh to get updated member list
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Thêm thành viên thất bại');
    }
  }, [loadGroups]);

  const removeUsersFromGroup = useCallback(async (groupId: number, userIds: number[]) => {
    try {
      await repository.removeUsers(groupId, userIds);
      await loadGroups(); // Refresh to get updated member list
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Xóa thành viên thất bại');
    }
  }, [loadGroups]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return {
    groups,
    isLoading,
    error,
    isCreating,
    loadGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    searchUsers,
    addUsersToGroup,
    removeUsersFromGroup,
  };
}