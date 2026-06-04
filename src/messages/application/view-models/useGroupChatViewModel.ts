// Description: Group chat ViewModel - coordinates group chat state with repositories.
// English description: Handles group chat, creation, and friend suggestions for group creation.
import { useState, useCallback, useEffect } from 'react';
import { createGroupChatRepository } from '../../infrastructure/repositories/ApiGroupChatRepository';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type {
  GroupChatItem,
  GroupChatUser,
  CreateGroupChatPayload,
} from '../../domain/types/groupChat.types';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

const groupRepository = createGroupChatRepository();
const userRepository = createUserRepository();

// Map UserProfile to GroupChatUser for selection
function mapToGroupChatUser(profile: UserProfile): GroupChatUser {
  // Handle both UserProfile and UserSummary id field names
  const userId = 'userId' in profile ? profile.userId : profile.id;
  return {
    user_id: Number(userId ?? 0),
    username: profile.username ?? '',
    first_name: profile.firstName ?? profile.name?.split(' ')[0] ?? '',
    last_name: profile.lastName ?? profile.name?.split(' ').slice(1).join(' ') ?? '',
    avatar: profile.avatarUrl ?? '',
    cover: profile.coverUrl ?? '',
  };
}

export interface UseGroupChatViewModelResult {
  // State - Groups
  groups: GroupChatItem[];
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;

  // State - Friends for selection
  suggestedFriends: GroupChatUser[];
  isLoadingFriends: boolean;
  friendsError: string | null;

  // Actions - Groups
  loadGroups: () => Promise<void>;
  createGroup: (payload: CreateGroupChatPayload) => Promise<GroupChatItem | null>;
  joinGroup: (groupId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  searchUsers: (groupId: number, keyword?: string) => Promise<GroupChatUser[]>;
  addUsersToGroup: (groupId: number, userIds: number[]) => Promise<void>;
  removeUsersFromGroup: (groupId: number, userIds: number[]) => Promise<void>;

  // Actions - Friends
  loadSuggestedFriends: () => Promise<void>;
  searchFriends: (keyword: string) => Promise<GroupChatUser[]>;
}

export function useGroupChatViewModel(): UseGroupChatViewModelResult {
  // Groups state
  const [groups, setGroups] = useState<GroupChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Friends state for group creation
  const [suggestedFriends, setSuggestedFriends] = useState<GroupChatUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // Load groups
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await groupRepository.getList({ limit: 50 });
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

  // Create group
  const createGroup = useCallback(async (payload: CreateGroupChatPayload): Promise<GroupChatItem | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await groupRepository.createGroup(payload);
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

  // Load suggested friends (following + followers) for group creation
  const loadSuggestedFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    setFriendsError(null);
    try {
      const session = sessionStorage.getSession();
      const currentUserId = Number(session?.userId ?? 0);

      if (!currentUserId) {
        setSuggestedFriends([]);
        return;
      }

      // Fetch both following and followers
      const friendsResult = await userRepository.getFriends({
        userId: String(currentUserId),
        type: ['following', 'followers'],
        limit: 50,
      });

      // Combine and deduplicate by user_id
      const allFriends = new Map<number, GroupChatUser>();

      const addFriend = (profile: UserProfile) => {
        const user = mapToGroupChatUser(profile);
        const userId = Number(user.user_id);

        if (!Number.isFinite(userId) || userId <= 0 || userId === currentUserId) {
          return;
        }

        allFriends.set(userId, user);
      };

      // Add following
      friendsResult.following.forEach(profile => {
        addFriend(profile);
      });

      // Add followers (only if not already added from following)
      friendsResult.followers.forEach(profile => {
        addFriend(profile);
      });

      setSuggestedFriends(Array.from(allFriends.values()));
    } catch (caughtError) {
      console.error('[useGroupChatViewModel] loadSuggestedFriends error:', caughtError);
      setFriendsError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tải danh sách bạn bè',
      );
      setSuggestedFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  // Search friends by keyword
  const searchFriends = useCallback(async (keyword: string): Promise<GroupChatUser[]> => {
    if (!keyword.trim()) {
      return suggestedFriends;
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    return suggestedFriends.filter(user =>
      user.first_name.toLowerCase().includes(lowerKeyword) ||
      user.last_name.toLowerCase().includes(lowerKeyword) ||
      user.username.toLowerCase().includes(lowerKeyword),
    );
  }, [suggestedFriends]);

  // Join group
  const joinGroup = useCallback(async (groupId: number) => {
    try {
      await groupRepository.joinGroup(groupId);
      await loadGroups();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Tham gia nhóm thất bại');
    }
  }, [loadGroups]);

  // Leave group
  const leaveGroup = useCallback(async (groupId: number) => {
    try {
      await groupRepository.leaveGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Rời nhóm thất bại');
    }
  }, []);

  // Delete group
  const deleteGroup = useCallback(async (groupId: number) => {
    try {
      await groupRepository.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Xóa nhóm thất bại');
    }
  }, []);

  // Search users for adding to existing group
  const searchUsers = useCallback(async (groupId: number, keyword?: string): Promise<GroupChatUser[]> => {
    try {
      return await groupRepository.searchAddableUsers(groupId, keyword);
    } catch (caughtError) {
      console.error('Search users error:', caughtError);
      return [];
    }
  }, []);

  // Add users to group
  const addUsersToGroup = useCallback(async (groupId: number, userIds: number[]) => {
    try {
      await groupRepository.addUsers(groupId, userIds);
      await loadGroups();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Thêm thành viên thất bại');
    }
  }, [loadGroups]);

  // Remove users from group
  const removeUsersFromGroup = useCallback(async (groupId: number, userIds: number[]) => {
    try {
      await groupRepository.removeUsers(groupId, userIds);
      await loadGroups();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Xóa thành viên thất bại');
    }
  }, [loadGroups]);

  // Initial load - groups and friends
  useEffect(() => {
    loadGroups();
    loadSuggestedFriends();
  }, [loadGroups, loadSuggestedFriends]);

  return {
    // Groups state
    groups,
    isLoading,
    error,
    isCreating,

    // Friends state
    suggestedFriends,
    isLoadingFriends,
    friendsError,

    // Groups actions
    loadGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    searchUsers,
    addUsersToGroup,
    removeUsersFromGroup,

    // Friends actions
    loadSuggestedFriends,
    searchFriends,
  };
}
