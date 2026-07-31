const mockPost = jest.fn();

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://v2.vnseea.test',
  },
}));

import { createPhotosRepository } from '../ApiPhotosRepository';

describe('ApiPhotosRepository album mapping', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('preserves album names and normalizes the cover metadata', async () => {
    mockPost.mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          id: 42,
          album_name: '<b>Mùa hè &amp; kỷ niệm</b>',
          first_image: 'upload/photos/summer.jpg',
          photo_album: [{ id: 1 }, { id: 2 }],
          postPrivacy: '0',
        },
        {
          id: 43,
          albumName: 'Những chuyến đi',
          first_image: 'https://cdn.vnseea.test/trips.jpg',
          photo_album: [{ id: 3 }],
          postPrivacy: '3',
        },
      ],
    });

    const page = await createPhotosRepository().getUserAlbums('viewer-1', {
      limit: 20,
    });

    expect(mockPost).toHaveBeenCalledWith('albums', {
      type: 'fetch',
      user_id: 'viewer-1',
      limit: '20',
      offset: '0',
    });
    expect(page.items).toEqual([
      expect.objectContaining({
        id: '42',
        albumName: 'Mùa hè & kỷ niệm',
        coverUrl: 'https://v2.vnseea.test/upload/photos/summer.jpg',
        photoCount: 2,
        privacy: 'public',
      }),
      expect.objectContaining({
        id: '43',
        albumName: 'Những chuyến đi',
        coverUrl: 'https://cdn.vnseea.test/trips.jpg',
        photoCount: 1,
        privacy: 'only_me',
      }),
    ]);
  });
});
