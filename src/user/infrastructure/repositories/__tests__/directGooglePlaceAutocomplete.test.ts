import type { MapPlacePrediction } from '../../../domain/types/user.types';
import {
  buildDirectGoogleAutocompleteParams,
  getDirectGooglePlacePredictions,
  mergeMapPlacePredictions,
} from '../directGooglePlaceAutocomplete';

const originalFetch = globalThis.fetch;

describe('direct Google place autocomplete', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the current location as a soft bias without hard bounds', () => {
    const params = buildDirectGoogleAutocompleteParams(
      {
        query: ' h ',
        lat: 10.7769,
        lng: 106.7009,
        radius: 5000,
        globalSearch: true,
      },
      'test-key',
    );

    expect(params.get('input')).toBe('h');
    expect(params.get('components')).toBe('country:vn');
    expect(params.get('language')).toBe('vi');
    expect(params.get('location')).toBe('10.7769,106.7009');
    expect(params.get('radius')).toBe('5000');
    expect(params.get('strictbounds')).toBeNull();
  });

  it('keeps fast autocomplete order while enriching duplicates with coordinates', () => {
    const fast: MapPlacePrediction[] = [
      {
        source: 'google',
        placeId: 'hai-phong',
        description: 'Hải Phòng, Việt Nam',
        mainText: 'Hải Phòng',
        secondaryText: 'Việt Nam',
        types: ['locality'],
      },
    ];
    const enriched: MapPlacePrediction[] = [
      {
        ...fast[0],
        lat: 20.8449,
        lng: 106.6881,
      },
      {
        source: 'google',
        placeId: 'hai-duong',
        description: 'Hải Dương, Việt Nam',
        mainText: 'Hải Dương',
        secondaryText: 'Việt Nam',
        types: ['locality'],
        lat: 20.9373,
        lng: 106.3146,
      },
    ];

    expect(mergeMapPlacePredictions(fast, enriched)).toEqual([
      enriched[0],
      enriched[1],
    ]);
  });

  it('maps a one-character Google response while keeping the bias non-strict', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'OK',
        predictions: [
          {
            place_id: 'hai-duong',
            description: 'Hải Dương, Việt Nam',
            structured_formatting: {
              main_text: 'Hải Dương',
              secondary_text: 'Việt Nam',
            },
            types: ['locality'],
          },
        ],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      getDirectGooglePlacePredictions(
        {
          query: 'h',
          lat: 10.7769,
          lng: 106.7009,
          radius: 5000,
          globalSearch: true,
        },
        'test-key',
      ),
    ).resolves.toEqual([
      {
        source: 'google',
        placeId: 'hai-duong',
        description: 'Hải Dương, Việt Nam',
        mainText: 'Hải Dương',
        secondaryText: 'Việt Nam',
        types: ['locality'],
      },
    ]);

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0] ?? ''));
    expect(requestUrl.searchParams.get('input')).toBe('h');
    expect(requestUrl.searchParams.get('location')).toBe('10.7769,106.7009');
    expect(requestUrl.searchParams.get('radius')).toBe('5000');
    expect(requestUrl.searchParams.get('strictbounds')).toBeNull();
  });
});
