import { apiRoutes } from '../../../application/constants/route-registry';
import { apiBridge } from '../../api/apiBridge';
import { readLastMapLocation } from '../../storage/mapLocationStorage';
import {
  createAddressSearchRepository,
  createAddressSessionToken,
  resolveAddressLocationBias,
} from '../ApiAddressSearchRepository';

jest.mock('../../api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

jest.mock('../../storage/mapLocationStorage', () => ({
  readLastMapLocation: jest.fn(),
}));

jest.mock('../../config/env', () => ({
  apiConfig: {
    googleMapsApiKey: 'test-google-key',
    googleMapsAndroidCertSha1: 'AA11BB22',
  },
}));

const post = apiBridge.post as jest.Mock;
const readPersistedLocation = readLastMapLocation as jest.Mock;
const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

describe('ApiAddressSearchRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readPersistedLocation.mockReturnValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it('uses the dedicated address autocomplete action with Vietnam and session context', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      predictions: [
        {
          place_id: 'place-1',
          description: '24 Ngõ 3 Tân Mỹ, Mỹ Đình 1, Hà Nội',
          main_text: '24 Ngõ 3 Tân Mỹ',
          secondary_text: 'Mỹ Đình 1, Hà Nội, Việt Nam',
          source: 'autocomplete',
        },
      ],
    });

    const repository = createAddressSearchRepository();
    const result = await repository.searchAddresses({
      query: '24 ngõ 3 Tân Mỹ, Mỹ Đình 1',
      language: 'vi',
      country: 'vn',
      locationBias: { latitude: 21.028, longitude: 105.78 },
      sessionToken: 'address_session_123456789',
    });

    expect(post).toHaveBeenCalledWith(apiRoutes.user.mapDiscovery, {
      type: 'address_autocomplete',
      query: '24 ngõ 3 Tân Mỹ, Mỹ Đình 1',
      language: 'vi',
      country: 'vn',
      origin_lat: 21.028,
      origin_lng: 105.78,
      radius: 50000,
      sessiontoken: 'address_session_123456789',
    });
    expect(result).toEqual([
      {
        placeId: 'place-1',
        description: '24 Ngõ 3 Tân Mỹ, Mỹ Đình 1, Hà Nội',
        mainText: '24 Ngõ 3 Tân Mỹ',
        secondaryText: 'Mỹ Đình 1, Hà Nội, Việt Nam',
        source: 'autocomplete',
        latitude: undefined,
        longitude: undefined,
      },
    ]);
  });

  it('geocodes the raw input and resolves every selected suggestion through details', async () => {
    post
      .mockResolvedValueOnce({
        api_status: 200,
        address: {
          place_id: 'geocode-1',
          address: '24 Ngõ 3 Tân Mỹ, Hà Nội, Việt Nam',
          lat: '21.035',
          lng: '105.77',
        },
      })
      .mockResolvedValueOnce({
        api_status: 200,
        address: {
          place_id: 'geocode-1',
          address: '24 Ngõ 3 Tân Mỹ, Mỹ Đình 1, Hà Nội, Việt Nam',
          lat: 21.035,
          lng: 105.77,
          city: 'Hà Nội',
          district: 'Nam Từ Liêm',
          ward: 'Mỹ Đình 1',
          country: 'Việt Nam',
        },
      });

    const repository = createAddressSearchRepository();
    const suggestions = await repository.geocodeAddress({
      query: '24 ngõ 3 Tân Mỹ, Mỹ Đình 1',
      language: 'vi',
      country: 'vn',
      sessionToken: 'address_session_123456789',
    });
    const resolved = await repository.resolveAddressSuggestion(
      suggestions[0],
      {
        language: 'vi',
        country: 'vn',
        sessionToken: 'address_session_123456789',
      },
    );

    expect(post).toHaveBeenNthCalledWith(1, apiRoutes.user.mapDiscovery, {
      type: 'address_geocode',
      query: '24 ngõ 3 Tân Mỹ, Mỹ Đình 1',
      language: 'vi',
      country: 'vn',
      sessiontoken: 'address_session_123456789',
    });
    expect(post).toHaveBeenNthCalledWith(2, apiRoutes.user.mapDiscovery, {
      type: 'address_details',
      place_id: 'geocode-1',
      language: 'vi',
      country: 'vn',
      sessiontoken: 'address_session_123456789',
    });
    expect(resolved).toEqual({
      placeId: 'geocode-1',
      formattedAddress:
        '24 Ngõ 3 Tân Mỹ, Mỹ Đình 1, Hà Nội, Việt Nam',
      latitude: 21.035,
      longitude: 105.77,
      city: 'Hà Nội',
      district: 'Nam Từ Liêm',
      ward: 'Mỹ Đình 1',
      country: 'Việt Nam',
    });
  });

  it('reverse-geocodes a coordinate and combines a nearby place name with its address', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      address: {
        place_id: 'geocode-1',
        name: 'Đường Lê Giang',
        address: 'Đường Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
        lat: 20.986961,
        lng: 105.760529,
      },
      nearby_places: [
        {
          place_id: 'nearby-1',
          name: 'Sân Bóng Athena Đại Mỗ',
          address: 'Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
          lat: 20.9872,
          lng: 105.7607,
          distance_meters: 32,
        },
      ],
    });

    const result = await createAddressSearchRepository().reverseGeocodeCoordinate({
      latitude: 20.986961,
      longitude: 105.760529,
      language: 'vi',
      country: 'vn',
      sessionToken: 'address_session_123456789',
    });

    expect(post).toHaveBeenCalledWith(apiRoutes.user.mapDiscovery, {
      type: 'reverse_geocode',
      lat: 20.986961,
      lng: 105.760529,
      language: 'vi',
      country: 'vn',
    });
    expect(result).toEqual({
      placeId: 'geocode-1',
      formattedAddress:
        'Đường Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
      latitude: 20.986961,
      longitude: 105.760529,
      city: undefined,
      district: undefined,
      ward: undefined,
      country: undefined,
      nearbySuggestions: [
        {
          placeId: 'nearby-1',
          name: 'Sân Bóng Athena Đại Mỗ',
          formattedAddress:
            'Sân Bóng Athena Đại Mỗ, Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
          latitude: 20.9872,
          longitude: 105.7607,
          distanceMeters: 32,
        },
      ],
    });
  });

  it('loads nearby suggestions directly when the deployed backend has not returned them yet', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      place: {
        place_id: 'geocode-1',
        address: 'Đường Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
        lat: 20.986961,
        lng: 105.760529,
      },
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'direct-nearby-1',
            name: 'Công ty TNHH Thương Mại TFY',
            vicinity: 'Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
            geometry: {
              location: { lat: 20.9869, lng: 105.7607 },
            },
          },
        ],
      }),
    });

    const result = await createAddressSearchRepository().reverseGeocodeCoordinate({
      latitude: 20.986961,
      longitude: 105.760529,
      language: 'vi',
      country: 'vn',
      sessionToken: 'address_session_123456789',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json?',
      ),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(result.nearbySuggestions[0]).toMatchObject({
      placeId: 'direct-nearby-1',
      name: 'Công ty TNHH Thương Mại TFY',
      formattedAddress:
        'Công ty TNHH Thương Mại TFY, Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
    });
  });

  it('falls back to address geocoding when reverse-geocode has no usable label', async () => {
    post
      .mockResolvedValueOnce({
        api_status: 404,
        errors: { error_id: 'address_not_found' },
      })
      .mockResolvedValueOnce({
        api_status: 200,
        address: {
          place_id: 'coordinate-geocode-1',
          address: 'Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
          lat: 20.986961,
          lng: 105.760529,
        },
      });

    const result = await createAddressSearchRepository().reverseGeocodeCoordinate({
      latitude: 20.986961,
      longitude: 105.760529,
      language: 'vi',
      country: 'vn',
      sessionToken: 'address_session_123456789',
    });

    expect(post).toHaveBeenNthCalledWith(2, apiRoutes.user.mapDiscovery, {
      type: 'address_geocode',
      query: '20.9869610,105.7605290',
      language: 'vi',
      country: 'vn',
      origin_lat: 20.986961,
      origin_lng: 105.760529,
      radius: 50000,
      sessiontoken: 'address_session_123456789',
    });
    expect(result.formattedAddress).toBe(
      'Lê Giang, Đại Mỗ, Nam Từ Liêm, Hà Nội',
    );
    expect(result.nearbySuggestions).toEqual([]);
  });

  it('prefers an explicit form coordinate over the persisted map location', () => {
    readPersistedLocation.mockReturnValue({
      latitude: 10.77,
      longitude: 106.69,
      timestamp: Date.now(),
    });

    expect(
      resolveAddressLocationBias({ latitude: 21.028, longitude: 105.78 }),
    ).toEqual({ latitude: 21.028, longitude: 105.78 });
    expect(resolveAddressLocationBias()).toEqual({
      latitude: 10.77,
      longitude: 106.69,
    });
  });

  it('creates a fresh billing session token in the accepted character set', () => {
    const first = createAddressSessionToken();
    const second = createAddressSessionToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{20,80}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{20,80}$/);
    expect(first).not.toBe(second);
  });

  it('preserves stable backend error codes without exposing raw Google errors', async () => {
    post.mockResolvedValueOnce({
      api_status: 500,
      errors: {
        error_id: 'google_not_configured',
        error_text: 'Google Maps API key is not configured.',
      },
    });

    await expect(
      createAddressSearchRepository().searchAddresses({
        query: '24 ngõ 3 Tân Mỹ',
        language: 'vi',
        country: 'vn',
        sessionToken: 'address_session_123456789',
      }),
    ).rejects.toThrow('google_not_configured');
  });
});
