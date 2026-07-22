// Description: Ranks VNSEEA Pages ahead of external places when names match a map search.
export type MapSearchRankCandidate = {
  source: 'page' | 'google';
  title: string;
  aliases?: string[];
  distanceMeters?: number;
  pinned?: boolean;
};

function normalizeRankingText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getMapSearchMatchPriority(
  query: string,
  candidate: MapSearchRankCandidate,
) {
  const normalizedQuery = normalizeRankingText(query);
  const normalizedTitles = [candidate.title, ...(candidate.aliases ?? [])]
    .map(normalizeRankingText)
    .filter(Boolean);

  if (normalizedQuery) {
    if (candidate.source === 'page') {
      if (normalizedTitles.some(title => title === normalizedQuery)) return 0;
      if (normalizedTitles.some(title => title.startsWith(normalizedQuery))) {
        return 1;
      }
      if (normalizedTitles.some(title => title.includes(normalizedQuery))) {
        return 2;
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
  const priorityDifference =
    getMapSearchMatchPriority(query, left) -
    getMapSearchMatchPriority(query, right);
  if (priorityDifference !== 0) return priorityDifference;

  const leftDistance = left.distanceMeters ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.distanceMeters ?? Number.POSITIVE_INFINITY;
  return leftDistance - rightDistance;
}
