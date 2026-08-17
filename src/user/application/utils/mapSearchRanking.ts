// Description: Ranks VNSEEA Pages ahead of external places when names match a map search.
export type MapSearchRankCandidate = {
  source: 'page' | 'google';
  title: string;
  aliases?: string[];
  distanceMeters?: number;
  pinned?: boolean;
};

export function normalizeMapSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAllQueryTokens(query: string, title: string) {
  const queryTokens = query.split(' ').filter(Boolean).slice(0, 8);
  if (queryTokens.length < 2) return false;

  const titleTokens = new Set(title.split(' ').filter(Boolean));
  return queryTokens.every(token => titleTokens.has(token));
}

function normalizedCandidateTitles(candidate: MapSearchRankCandidate) {
  return [candidate.title, ...(candidate.aliases ?? [])]
    .map(normalizeMapSearchText)
    .filter(Boolean);
}

export function doesMapSearchCandidateMatchQuery(
  query: string,
  candidate: MapSearchRankCandidate,
) {
  const normalizedQuery = normalizeMapSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedTitles = normalizedCandidateTitles(candidate);
  if (normalizedTitles.some(title => title.includes(normalizedQuery))) {
    return true;
  }
  return (
    candidate.source === 'page' &&
    containsAllQueryTokens(normalizedQuery, normalizedTitles.join(' '))
  );
}

export function getMapSearchMatchPriority(
  query: string,
  candidate: MapSearchRankCandidate,
) {
  const normalizedQuery = normalizeMapSearchText(query);
  const normalizedTitles = normalizedCandidateTitles(candidate);

  if (normalizedQuery) {
    if (candidate.source === 'page') {
      if (normalizedTitles.some(title => title === normalizedQuery)) return 0;
      if (normalizedTitles.some(title => title.startsWith(normalizedQuery))) {
        return 1;
      }
      if (normalizedTitles.some(title => title.includes(normalizedQuery))) {
        return 2;
      }
      if (containsAllQueryTokens(normalizedQuery, normalizedTitles.join(' '))) {
        return 3;
      }
    } else {
      const normalizedTitle = normalizedTitles[0] ?? '';
      if (normalizedTitle === normalizedQuery) return 3;
      if (normalizedTitle.startsWith(normalizedQuery)) return 4;
      if (normalizedTitle.includes(normalizedQuery)) return 5;
    }
  }

  if (candidate.source === 'page') {
    return candidate.pinned ? 6 : 7;
  }

  return 8;
}

export function compareMapSearchRankCandidates(
  query: string,
  left: MapSearchRankCandidate,
  right: MapSearchRankCandidate,
) {
  // Search results are grouped by source: VNSEEA Pages first, then Google
  // places. Page name relevance is always evaluated before distance.
  if (left.source !== right.source) {
    return left.source === 'page' ? -1 : 1;
  }

  const priorityDifference =
    getMapSearchMatchPriority(query, left) -
    getMapSearchMatchPriority(query, right);
  const leftHasDistance = Number.isFinite(left.distanceMeters);
  const rightHasDistance = Number.isFinite(right.distanceMeters);

  if (left.source === 'google') {
    if (leftHasDistance !== rightHasDistance) {
      return leftHasDistance ? -1 : 1;
    }
    if (!leftHasDistance && !rightHasDistance) {
      // Direct autocomplete is already softly biased around the user. Keep
      // that provider order until the enriched coordinates arrive.
      return 0;
    }
    if (
      leftHasDistance &&
      rightHasDistance &&
      left.distanceMeters !== right.distanceMeters
    ) {
      return left.distanceMeters! - right.distanceMeters!;
    }
    return priorityDifference;
  }

  if (priorityDifference !== 0) return priorityDifference;
  if (leftHasDistance !== rightHasDistance) {
    return leftHasDistance ? -1 : 1;
  }
  if (
    leftHasDistance &&
    rightHasDistance &&
    left.distanceMeters !== right.distanceMeters
  ) {
    return left.distanceMeters! - right.distanceMeters!;
  }
  return 0;
}

export function takePrioritizedMapSearchResults<T>(
  items: readonly T[],
  limit: number,
  compare: (left: T, right: T) => number,
) {
  return [...items]
    .sort(compare)
    .slice(0, Math.max(0, Math.floor(limit)));
}
