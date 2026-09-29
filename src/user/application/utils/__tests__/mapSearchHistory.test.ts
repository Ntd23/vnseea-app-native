import type { MapSearchHistoryEntry } from '../../../domain/types/user.types';
import {
  filterMapSearchHistory,
  mapSearchHistoryEntryTitle,
} from '../mapSearchHistory';

const entries: MapSearchHistoryEntry[] = [
  { kind: 'query', id: 'ca phe', query: 'cà phê', savedAt: 3 },
  {
    kind: 'page',
    id: 'page-7',
    page: {
      id: 'page-7',
      kind: 'business',
      name: 'Tiệm Tóc Mây',
      location: '5 Hai Bà Trưng',
    },
    savedAt: 2,
  },
  {
    kind: 'google',
    id: 'ChIJ-1',
    prediction: {
      source: 'google',
      placeId: 'ChIJ-1',
      description: 'Hồ Gươm, Hoàn Kiếm, Hà Nội',
      mainText: 'Hồ Gươm',
      secondaryText: 'Hoàn Kiếm, Hà Nội',
    },
    savedAt: 1,
  },
];

describe('map search history matching', () => {
  it('returns the newest entries when nothing is typed', () => {
    expect(filterMapSearchHistory(entries, '  ', 2).map(entry => entry.id)).toEqual([
      'ca phe',
      'page-7',
    ]);
  });

  it('matches titles and addresses without accents', () => {
    expect(filterMapSearchHistory(entries, 'ca', 3).map(entry => entry.id)).toEqual([
      'ca phe',
    ]);
    expect(filterMapSearchHistory(entries, 'hai ba', 3).map(entry => entry.id)).toEqual([
      'page-7',
    ]);
    expect(filterMapSearchHistory(entries, 'hoan kiem', 3).map(entry => entry.id)).toEqual([
      'ChIJ-1',
    ]);
  });

  it('uses the keyword or place name as the row title', () => {
    expect(entries.map(mapSearchHistoryEntryTitle)).toEqual([
      'cà phê',
      'Tiệm Tóc Mây',
      'Hồ Gươm',
    ]);
  });
});
