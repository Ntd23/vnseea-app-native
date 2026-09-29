const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { sessionStorage } from '../../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { NearbyPlace } from '../../../domain/types/user.types';
import {
  MAP_SEARCH_HISTORY_LIMIT,
  addMapSearchHistoryEntry,
  clearMapSearchHistory,
  readMapSearchHistory,
  removeMapSearchHistoryEntry,
} from '../mapSearchHistoryStorage';

const page: NearbyPlace = {
  id: 'page-7',
  pageId: '7',
  kind: 'business',
  source: 'page',
  name: 'Cà phê Sân Vườn',
  location: '12 Lê Lợi, Quận 1',
  coordinate: { latitude: 10.77, longitude: 106.7 },
  distanceMeters: 420,
  rating: 4.6,
  reviews: [],
  photoUrls: ['https://example.com/photo.jpg'],
};

describe('mapSearchHistoryStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-28T00:00:00.000Z'));
    mockValues.clear();
    sessionStorage.clearSession();
    sessionStorage.setSession({ accessToken: 'token', userId: 'user-1' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the newest entry first and moves repeats to the top', () => {
    addMapSearchHistoryEntry({ kind: 'query', query: 'cà phê' });
    addMapSearchHistoryEntry({ kind: 'page', page });
    addMapSearchHistoryEntry({ kind: 'query', query: '  Ca   Phe ' });

    expect(
      readMapSearchHistory().map(entry => [entry.kind, entry.id]),
    ).toEqual([
      ['query', 'ca phe'],
      ['page', 'page-7'],
    ]);
    expect(readMapSearchHistory()[0]).toMatchObject({ query: 'Ca Phe' });
  });

  it('stores only the place fields needed to reopen it', () => {
    addMapSearchHistoryEntry({ kind: 'page', page });

    const [entry] = readMapSearchHistory();
    expect(entry).toMatchObject({
      kind: 'page',
      page: {
        id: 'page-7',
        pageId: '7',
        name: 'Cà phê Sân Vườn',
        coordinate: { latitude: 10.77, longitude: 106.7 },
      },
    });
    expect(entry.kind === 'page' && entry.page.distanceMeters).toBeFalsy();
    expect(entry.kind === 'page' && entry.page.reviews).toBeUndefined();
    expect(entry.kind === 'page' && entry.page.photoUrls).toBeUndefined();
  });

  it('caps the history length', () => {
    for (let index = 0; index < MAP_SEARCH_HISTORY_LIMIT + 5; index += 1) {
      addMapSearchHistoryEntry({ kind: 'query', query: `quán ${index}` });
    }

    const history = readMapSearchHistory();
    expect(history).toHaveLength(MAP_SEARCH_HISTORY_LIMIT);
    expect(history[0]).toMatchObject({
      query: `quán ${MAP_SEARCH_HISTORY_LIMIT + 4}`,
    });
  });

  it('removes one entry or clears everything', () => {
    addMapSearchHistoryEntry({ kind: 'query', query: 'cây xăng' });
    addMapSearchHistoryEntry({
      kind: 'google',
      prediction: {
        source: 'google',
        placeId: 'ChIJ-1',
        description: 'Hồ Gươm, Hoàn Kiếm, Hà Nội',
        mainText: 'Hồ Gươm',
      },
    });

    expect(removeMapSearchHistoryEntry({ kind: 'google', id: 'ChIJ-1' })).toEqual([
      expect.objectContaining({ kind: 'query', query: 'cây xăng' }),
    ]);
    expect(clearMapSearchHistory()).toEqual([]);
    expect(readMapSearchHistory()).toEqual([]);
  });

  it('separates history per signed-in user', () => {
    addMapSearchHistoryEntry({ kind: 'query', query: 'nhà thuốc' });
    sessionStorage.setSession({ accessToken: 'token', userId: 'user-2' });

    expect(readMapSearchHistory()).toEqual([]);
  });

  it('ignores empty queries and corrupt storage', () => {
    expect(addMapSearchHistoryEntry({ kind: 'query', query: '   ' })).toEqual([]);

    mockValues.set('recent:user-1', '{not json');
    expect(readMapSearchHistory()).toEqual([]);

    mockValues.set(
      'recent:user-1',
      JSON.stringify([{ kind: 'query', id: 'x', query: '', savedAt: 1 }]),
    );
    expect(readMapSearchHistory()).toEqual([]);
  });
});
