import {
  compareMapSearchRankCandidates,
  getMapSearchMatchPriority,
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

  it('uses pinned status and distance only after name relevance', () => {
    expect(
      getMapSearchMatchPriority('tiệm tóc', {
        source: 'page',
        title: 'Một Page khác',
        pinned: true,
      }),
    ).toBe(6);

    const result = rank('tiệm tóc', [
      { source: 'page', title: 'Page A', distanceMeters: 900 },
      { source: 'page', title: 'Page B', distanceMeters: 300 },
    ]);
    expect(result[0]?.title).toBe('Page B');
  });
});
