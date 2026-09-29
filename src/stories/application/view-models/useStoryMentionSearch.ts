// Description: Searches the people a user follows to mention them in a story.
import { useEffect, useState } from 'react';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';

const feedRepository = createFeedRepository();
const MENTION_SEARCH_DEBOUNCE_MS = 200;

export type StoryMentionCandidate = {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
};

export function useStoryMentionSearch(query: string, enabled: boolean) {
  const [candidates, setCandidates] = useState<StoryMentionCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      feedRepository
        .searchMentionSuggestions(query.trim().replace(/^@/, ''))
        .then(suggestions => {
          if (cancelled) return;
          setCandidates(
            suggestions
              // Notifications need a numeric user id, not a username fallback.
              .filter(suggestion => /^\d+$/.test(suggestion.id))
              .map(suggestion => ({
                userId: suggestion.id,
                username: (suggestion.backendValue ?? '').replace(/^@/, ''),
                name: suggestion.label,
                avatarUrl: suggestion.avatarUrl,
              })),
          );
        })
        .catch(() => {
          if (!cancelled) setCandidates([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, MENTION_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, query]);

  return { candidates, isLoading };
}
