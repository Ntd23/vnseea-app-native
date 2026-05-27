// Search ViewModel
// Handles search state and business logic

import { useState, useCallback, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = createSearchRepository();

  // Load friend suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true);
      setError(null);
      const result = await repository.getSuggestions(12);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('[Search] Failed to load suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const searchUsers = useCallback(async (query: string, filter?: SearchFilter) => {
    if (!query.trim() && !filter?.keyword) {
      setSearchResults([]);
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
  }, []);

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
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

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
