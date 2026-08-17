import {
  compareMapSearchRankCandidates,
  doesMapSearchCandidateMatchQuery,
  getMapSearchMatchPriority,
  takePrioritizedMapSearchResults,
  type MapSearchRankCandidate,
} from '../mapSearchRanking';

const rank = (query: string, candidates: MapSearchRankCandidate[]) =>
  [...candidates].sort((left, right) =>
    compareMapSearchRankCandidates(query, left, right),
  );

describe('map search ranking', () => {
  it('puts an exact VNSEEA Page match before every Google result', () => {
    const result = rank('tiệm tóc', [
      { source: 'google', title: 'Tiệm tóc', distanceMeters: 50 },
      { source: 'page', title: 'TIỆM TÓC', distanceMeters: 2000 },
    ]);

    expect(result[0]?.source).toBe('page');
  });

  it('puts matching Pages before closer Google places', () => {
    const result = rank('tiệm tóc', [
      { source: 'google', title: 'Tiệm tóc Đức Huy', distanceMeters: 40 },
      { source: 'page', title: 'Tiệm tóc VNSEEA', distanceMeters: 1800 },
    ]);

    expect(result[0]?.source).toBe('page');
  });

  it('matches a VNSEEA Page username alias before Google places', () => {
    const result = rank('tiem-toc', [
      { source: 'google', title: 'Tiệm tóc', distanceMeters: 40 },
      {
        source: 'page',
        title: 'Dịch vụ Đức Huy',
        aliases: ['tiem-toc'],
        distanceMeters: 900,
      },
    ]);

    expect(result[0]?.source).toBe('page');
  });

  it('uses name relevance before pinned status or Page distance', () => {
    expect(
      getMapSearchMatchPriority('tiệm tóc', {
        source: 'page',
        title: 'Một Page khác',
        pinned: true,
      }),
    ).toBe(6);

    const result = rank('Page B', [
      {
        source: 'page',
        title: 'Page A',
        distanceMeters: 900,
        pinned: true,
      },
      { source: 'page', title: 'Page B', distanceMeters: 300 },
    ]);
    expect(result[0]?.title).toBe('Page B');
  });

  it('treats Page names containing all query tokens as a close match', () => {
    expect(
      getMapSearchMatchPriority('TH water', {
        source: 'page',
        title: 'TH true water',
      }),
    ).toBe(3);
    expect(
      doesMapSearchCandidateMatchQuery('TH water', {
        source: 'page',
        title: 'TH true water',
      }),
    ).toBe(true);
  });

  it('combines Page title and username tokens consistently with the backend', () => {
    const candidate: MapSearchRankCandidate = {
      source: 'page',
      title: 'TH Shop',
      aliases: ['true-water'],
    };

    expect(getMapSearchMatchPriority('TH water', candidate)).toBe(3);
    expect(doesMapSearchCandidateMatchQuery('TH water', candidate)).toBe(true);
  });

  it('matches Page tokens in any order, including one-character tokens', () => {
    expect(
      doesMapSearchCandidateMatchQuery('alpha beta', {
        source: 'page',
        title: 'Beta Alpha',
      }),
    ).toBe(true);
    expect(
      doesMapSearchCandidateMatchQuery('B coffee', {
        source: 'page',
        title: 'B House Coffee',
      }),
    ).toBe(true);
  });

  it('uses distance only to break ties between equally relevant Page names', () => {
    const result = rank('true water', [
      {
        source: 'page',
        title: 'TH true water',
        distanceMeters: 1_200_000,
      },
      {
        source: 'page',
        title: 'Shop true water',
        distanceMeters: 50,
      },
    ]);

    expect(result.map(item => item.title)).toEqual([
      'Shop true water',
      'TH true water',
    ]);
  });

  it('keeps Pages first, then orders Google addresses from near to far', () => {
    const result = rank('hải dương', [
      {
        source: 'google',
        title: 'Hải Dương',
        distanceMeters: 120_000,
      },
      {
        source: 'google',
        title: 'Hải Dương Riverside',
        distanceMeters: 1_200,
      },
      {
        source: 'page',
        title: 'Page Hải Dương',
        distanceMeters: 180_000,
      },
    ]);

    expect(result.map(item => item.title)).toEqual([
      'Page Hải Dương',
      'Hải Dương Riverside',
      'Hải Dương',
    ]);
  });

  it('puts Google results with a known distance before unknown-distance results', () => {
    const result = rank('h', [
      { source: 'google', title: 'Hải Phòng' },
      { source: 'google', title: 'Hẻm 12', distanceMeters: 450 },
    ]);

    expect(result.map(item => item.title)).toEqual(['Hẻm 12', 'Hải Phòng']);
  });

  it('preserves Google provider order until distances are available', () => {
    const result = rank('hải dương', [
      { source: 'google', title: 'Hải Dương Riverside' },
      { source: 'google', title: 'Hải Dương' },
    ]);

    expect(result.map(item => item.title)).toEqual([
      'Hải Dương Riverside',
      'Hải Dương',
    ]);
  });

  it('keeps every ranked Page ahead of Google until the result limit is full', () => {
    const pages = Array.from({ length: 15 }, (_, index) => ({
      source: 'page' as const,
      title: `Page ${index + 1}`,
    }));
    const googlePlaces = Array.from({ length: 10 }, (_, index) => ({
      source: 'google' as const,
      title: `Google ${index + 1}`,
    }));

    const result = takePrioritizedMapSearchResults(
      [...googlePlaces, ...pages],
      20,
      (left, right) =>
        compareMapSearchRankCandidates('page', left, right),
    );

    expect(result.filter(item => item.source === 'page')).toHaveLength(15);
    expect(result.slice(0, 15).every(item => item.source === 'page')).toBe(true);
    expect(result.slice(15).every(item => item.source === 'google')).toBe(true);
  });
});
