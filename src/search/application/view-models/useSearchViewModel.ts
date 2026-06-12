// Search ViewModel
// Handles global search state and business logic.

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createSearchRepository } from '../../infrastructure/repositories/ApiSearchRepository';
import type {
  GlobalSearchTab,
  SearchFilter,
  SearchResponse,
  SuggestionResult,
} from '../../domain/types/search.types';

const EMPTY_RESULTS: SearchResponse = {
  users: [],
  pages: [],
  groups: [],
  jobs: [],
  funding: [],
};

function countResults(results: SearchResponse) {
  return (
    results.users.length +
    results.pages.length +
    results.groups.length +
    results.jobs.length +
    results.funding.length
  );
}

export function useSearchViewModel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [activeTab, setActiveTab] = useState<GlobalSearchTab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const repository = useMemo(() => createSearchRepository(), []);

  useEffect(() => {
    async function loadSuggestions() {
      try {
        setIsLoadingSuggestions(true);
        const res = await repository.getSuggestions(20);
        setSuggestions(res.suggestions);
      } catch (err) {
        console.error('[Search] Failed to load suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
    loadSuggestions();
  }, [repository]);

  const searchAll = useCallback(
    async (query: string, filter?: SearchFilter) => {
      const keyword = query.trim() || filter?.keyword?.trim() || '';

      if (!keyword) {
        setResults(EMPTY_RESULTS);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await repository.searchAll({
          ...filter,
          keyword,
        });
        setResults(response);
      } catch (caught) {
        console.error('[Search] Failed to search globally:', caught);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể tìm kiếm. Vui lòng thử lại.',
        );
        setResults(EMPTY_RESULTS);
      } finally {
        setIsLoading(false);
      }
    },
    [repository],
  );

  const toggleFollow = useCallback(
    async (userId: string, isCurrentlyFollowing: boolean) => {
      const next = !isCurrentlyFollowing;

      setResults(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.userId === userId ? { ...user, isFollowing: next } : user,
        ),
      }));

      try {
        await repository.followUser(userId);
      } catch (caught) {
        console.error('[Search] Failed to toggle follow:', caught);
        setResults(prev => ({
          ...prev,
          users: prev.users.map(user =>
            user.userId === userId
              ? { ...user, isFollowing: isCurrentlyFollowing }
              : user,
          ),
        }));
      }
    },
    [repository],
  );

  const searchUsers = useCallback(
    async (query: string) => {
      const keyword = query.trim();
      if (!keyword) {
        setResults(EMPTY_RESULTS);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await repository.searchUsers({ keyword });
        setResults(response);
      } catch (caught) {
        console.error('[Search] Failed to search users:', caught);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể tìm kiếm người dùng.',
        );
        setResults(EMPTY_RESULTS);
      } finally {
        setIsLoading(false);
      }
    },
    [repository],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setResults(EMPTY_RESULTS);
    setError(null);
    setActiveTab('all');
  }, []);

  const totalResults = useMemo(() => countResults(results), [results]);

  return {
    searchQuery,
    setSearchQuery,
    results,
    searchResults: results.users,
    suggestions,
    totalResults,
    activeTab,
    setActiveTab,
    isLoading,
    isLoadingSuggestions,
    error,
    searchAll,
    searchUsers,
    toggleFollow,
    clearSearch,
  };
}
