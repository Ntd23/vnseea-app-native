import { buildMapBusinessSearchRequest } from '../mapBusinessSearchRequest';

describe('map business search request', () => {
  it.each([
    'tóc',
    'quán ăn',
    'bánh sinh nhật',
    'sửa xe',
    'cây xăng',
  ])('keeps the exact business query for %s', query => {
    const payload = buildMapBusinessSearchRequest({
      query: `  ${query}  `,
      lat: 21.0285,
      lng: 105.8542,
      radius: 5000,
      fast: true,
    });

    expect(payload).toEqual({
      type: 'place_autocomplete',
      search_mode: 'business',
      query,
      category: undefined,
      origin_lat: 21.0285,
      origin_lng: 105.8542,
      radius: 5000,
      fast: 1,
      global_search: undefined,
    });
    expect(payload).not.toHaveProperty('prefer_address');
  });

  it('preserves a recognized category as an optional hint', () => {
    expect(
      buildMapBusinessSearchRequest({
        query: 'quán tóc',
        category: 'hair_care',
        globalSearch: true,
      }),
    ).toEqual({
      type: 'place_autocomplete',
      search_mode: 'business',
      query: 'quán tóc',
      category: 'hair_care',
      origin_lat: undefined,
      origin_lng: undefined,
      radius: undefined,
      fast: undefined,
      global_search: 1,
    });
  });
});

