// Description: Verifies the app-side nationwide Page fallback used by map search.
const mockPost = jest.fn();

jest.mock(
  '../../../../shared-kernel/infrastructure/api/apiBridge',
  () => ({
    apiBridge: {
      get: jest.fn(),
      multipart: jest.fn(),
      post: (...args: unknown[]) => mockPost(...args),
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/config/env',
  () => ({
    apiConfig: {
      webBaseUrl: 'https://vnseea.example',
      mediaBaseUrl: 'https://cdn.vnseea.example',
      googleMapsApiKey: '',
      googleMapsAndroidPackage: '',
      googleMapsAndroidCertSha1: '',
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: jest.fn(() => ({ userId: '42' })),
    },
  }),
);

import { createUserRepository } from '../ApiUserRepository';

describe('ApiUserRepository nationwide Page search fallback', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('keeps a far-away Page from the existing global search API when map discovery returns none', async () => {
    mockPost.mockImplementation((route: string) => {
      if (route === 'map_discovery') {
        return Promise.resolve({ api_status: 200, items: [] });
      }
      if (route === 'search') {
        return Promise.resolve({
          api_status: 200,
          pages: [
            {
              page_id: '9001',
              page_name: 'page-hai-duong',
              page_title: 'Page Hải Dương',
              address: 'Hải Dương, Việt Nam',
              place_id: 'vnseea-hai-duong',
              lat: '20.9373',
              lng: '106.3146',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected route: ${route}`));
    });

    const signal = new AbortController().signal;
    const result = await createUserRepository().getNearbyPages({
      keyword: 'Page Hải Dương',
      limit: 20,
      lat: 10.7769,
      lng: 106.7009,
      distance: 20,
      globalSearch: true,
      signal,
    });

    expect(mockPost).toHaveBeenCalledWith(
      'search',
      {
        search_key: 'Page Hải Dương',
        limit: 20,
        user_offset: 0,
        page_offset: 0,
        group_offset: 0,
      },
      expect.objectContaining({ signal }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'page:9001',
        pageId: '9001',
        name: 'Page Hải Dương',
        username: 'page-hai-duong',
        location: 'Hải Dương, Việt Nam',
        placeId: 'vnseea-hai-duong',
        coordinate: {
          latitude: 20.9373,
          longitude: 106.3146,
        },
      }),
    ]);
  });
});
