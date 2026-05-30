// Search ViewModel
// Handles search state and business logic

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createSearchRepository } from '../../infrastructure/repositories/ApiSearchRepository';
import type {
  SearchFilter,
  SearchResult,
  SuggestionResult,
} from '../../domain/types/search.types';

export function useSearchViewModel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [defaultPeople, setDefaultPeople] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => createSearchRepository(), []);

  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true);
      setError(null);
      
      const [sugResult, peopleResult, nearbyResult] = await Promise.all([
        repository.getSuggestions(10).catch(() => ({ suggestions: [] })),
        repository.searchUsers({}).catch(() => ({ users: [] })),
        repository.getNearbyUsers({}).catch(() => ({ users: [] })),
      ]);

      type PoolUser = {
        userId: string;
        username: string;
        name: string;
        avatar: string;
        isFollowing: boolean;
        mutualFriends?: number;
        cover?: string;
        gender?: string;
        verified?: boolean;
        lastSeen?: string;
        lastSeenText?: string;
        followingCount?: number;
        followersCount?: number;
        distance?: number;
      };

      const buildPool = (lists: PoolUser[][]): PoolUser[] => {
        const pool: PoolUser[] = [];
        const seen = new Set<string>();

        const addUsers = (list: PoolUser[]) => {
          for (const user of list) {
            if (!user || !user.userId) continue;
            if (!seen.has(user.userId)) {
              seen.add(user.userId);
              pool.push({
                userId: user.userId,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                isFollowing: user.isFollowing,
                mutualFriends: user.mutualFriends,
                cover: 'cover' in user ? user.cover : undefined,
                gender: 'gender' in user ? user.gender : '',
                verified: 'verified' in user ? user.verified : false,
                lastSeen: 'lastSeen' in user ? user.lastSeen : undefined,
                lastSeenText:
                  'lastSeenText' in user ? user.lastSeenText : undefined,
                followingCount:
                  'followingCount' in user ? user.followingCount : undefined,
                followersCount:
                  'followersCount' in user ? user.followersCount : undefined,
                distance: 'distance' in user ? user.distance : undefined,
              });
            }
          }
        };

        lists.forEach(addUsers);
        return pool;
      };

      const suggestionPool = buildPool([
        sugResult.suggestions,
        nearbyResult.users,
      ]).filter(user => !user.isFollowing);
      const peoplePool = buildPool([
        peopleResult.users,
        nearbyResult.users,
        sugResult.suggestions,
      ]);

      const shuffledSuggestions = [...suggestionPool].sort(
        () => Math.random() - 0.5,
      );
      const shuffledPeople = [...peoplePool].sort(() => Math.random() - 0.5);

      const suggestions10: SuggestionResult[] = shuffledSuggestions
        .slice(0, 10)
        .map(u => ({
          userId: u.userId,
          username: u.username,
          name: u.name,
          avatar: u.avatar,
          mutualFriends: u.mutualFriends,
          isFollowing: u.isFollowing,
        }));

      const defaultPeople20: SearchResult[] = shuffledPeople
        .slice(0, 20)
        .map(u => ({
          userId: u.userId,
          username: u.username,
          name: u.name,
          avatar: u.avatar,
          cover: u.cover,
          gender: u.gender ?? '',
          verified: !!u.verified,
          isFollowing: u.isFollowing,
          lastSeen: u.lastSeen,
          lastSeenText: u.lastSeenText,
          followingCount: u.followingCount,
          followersCount: u.followersCount,
          mutualFriends: u.mutualFriends,
          distance: u.distance,
        }));

      setSuggestions(suggestions10);
      setDefaultPeople(defaultPeople20);
      setSearchResults(defaultPeople20);
    } catch (err) {
      console.error('[Search] Failed to load suggestions:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Không tải được danh sách người dùng',
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [repository]);

  // Load default friend suggestions and people as soon as the screen mounts.
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const searchUsers = useCallback(async (query: string, filter?: SearchFilter) => {
    if (!query.trim() && !filter?.keyword) {
      setSearchResults(defaultPeople);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await repository.searchUsers({
        ...filter,
        keyword: query.trim() || filter?.keyword,
      });
      setSearchResults(result.users);
    } catch (err) {
      console.error('[Search] Failed to search users:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [defaultPeople, repository]);

  const toggleFollow = useCallback(async (userId: string, isCurrentlyFollowing: boolean) => {
    try {
      // Optimistic update
      setSearchResults(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user,
        ),
      );
      setSuggestions(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user,
        ),
      );
      setDefaultPeople(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user,
        ),
      );

      // Call API
      await repository.followUser(userId);
    } catch (err) {
      console.error('[Search] Failed to toggle follow:', err);
      // Revert on error
      setSearchResults(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: isCurrentlyFollowing }
            : user,
        ),
      );
      setSuggestions(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: isCurrentlyFollowing }
            : user,
        ),
      );
      setDefaultPeople(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isFollowing: isCurrentlyFollowing }
            : user,
        ),
      );
    }
  }, [repository]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(defaultPeople);
  }, [defaultPeople]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchResults,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    error,

    // Actions
    searchUsers,
    toggleFollow,
    clearSearch,
    loadSuggestions,
  };
}
