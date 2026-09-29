// Description: Picks recent map searches that match what the user is typing.
import type { MapSearchHistoryEntry } from '../../domain/types/user.types';
import { normalizeMapSearchText } from './mapSearchRanking';

export function mapSearchHistoryEntryTitle(entry: MapSearchHistoryEntry) {
  if (entry.kind === 'query') return entry.query;
  if (entry.kind === 'page') return entry.page.name;
  return entry.prediction.mainText || entry.prediction.description;
}

function searchableText(entry: MapSearchHistoryEntry) {
  if (entry.kind === 'query') return entry.query;
  if (entry.kind === 'page') {
    return [entry.page.name, entry.page.username, entry.page.location]
      .filter(Boolean)
      .join(' ');
  }
  return [
    entry.prediction.mainText,
    entry.prediction.secondaryText,
    entry.prediction.description,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Newest-first entries whose text contains the query, ignoring accents and case. */
export function filterMapSearchHistory(
  entries: readonly MapSearchHistoryEntry[],
  query: string,
  limit: number,
) {
  const normalizedQuery = normalizeMapSearchText(query);
  const matches = normalizedQuery
    ? entries.filter(entry =>
        normalizeMapSearchText(searchableText(entry)).includes(normalizedQuery),
      )
    : entries;
  return matches.slice(0, Math.max(0, limit));
}
