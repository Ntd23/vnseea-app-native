import type { ApiFile } from '../../../../shared-kernel/domain/types/api.types';
import {
  PROFILE_MEDIA_CONTRACT,
  buildProfileMediaUploadPayload,
  parseProfileMediaUpdateResponse,
  uploadProfileMediaWithReconciliation,
} from '../profileMediaUpdate';

const coverFile: ApiFile = {
  uri: 'file:///tmp/cover.jpg',
  name: 'cover.jpg',
  type: 'image/jpeg',
};

describe('profile media update contract', () => {
  it('sends the canonical crop contract with exactly the selected media file', () => {
    expect(buildProfileMediaUploadPayload('cover', coverFile)).toEqual({
      profile_media_contract: PROFILE_MEDIA_CONTRACT,
      cover: coverFile,
    });
  });

  it('does not block a successful upload on another profile request', async () => {
    const uploadResult = {
      kind: 'cover' as const,
      url: 'https://cdn.vnseea.vn/cover.jpg?cache=2',
      fullUrl: 'https://cdn.vnseea.vn/cover_full.jpg?cache=2',
      postId: '12',
      postType: 'profile_cover_picture' as const,
    };
    const loadSnapshot = jest.fn();

    await expect(
      uploadProfileMediaWithReconciliation('cover', coverFile, {
        upload: jest.fn().mockResolvedValue(uploadResult),
        loadSnapshot,
        beforeSnapshot: {
          coverUrl: 'https://cdn.vnseea.vn/old.jpg?cache=1',
          coverPostId: '11',
        },
      }),
    ).resolves.toEqual(uploadResult);

    expect(loadSnapshot).not.toHaveBeenCalled();
  });

  it('parses the canonical server result and rejects the wrong media kind', () => {
    const response = {
      api_status: 200,
      profile_media: {
        kind: 'cover',
        url: 'https://cdn.vnseea.vn/cover.jpg',
        full_url: 'https://cdn.vnseea.vn/cover_full.jpg',
        post_id: '91',
        post_type: 'profile_cover_picture',
      },
    };

    expect(parseProfileMediaUpdateResponse(response, 'cover')).toEqual({
      kind: 'cover',
      url: response.profile_media.url,
      fullUrl: response.profile_media.full_url,
      postId: '91',
      postType: 'profile_cover_picture',
    });
    expect(() => parseProfileMediaUpdateResponse(response, 'avatar')).toThrow(
      'profile_media_invalid_response',
    );
  });

  it('reconciles a lost upload response from the changed profile post id', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce({
        coverUrl: 'https://cdn.vnseea.vn/old.jpg',
        coverPostId: '10',
      })
      .mockResolvedValueOnce({
        coverUrl: 'https://cdn.vnseea.vn/new.jpg',
        coverPostId: '11',
      });

    await expect(
      uploadProfileMediaWithReconciliation('cover', coverFile, {
        upload: jest.fn().mockRejectedValue(new Error('Network Error')),
        loadSnapshot,
      }),
    ).resolves.toEqual({
      kind: 'cover',
      url: 'https://cdn.vnseea.vn/new.jpg',
      fullUrl: 'https://cdn.vnseea.vn/new.jpg',
      postId: '11',
      postType: 'profile_cover_picture',
      reconciled: true,
    });
  });

  it('reconciles a successful response from a legacy API deployment', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce({
        coverUrl: 'https://cdn.vnseea.vn/old.jpg',
        coverPostId: '10',
      })
      .mockResolvedValueOnce({
        coverUrl: 'https://cdn.vnseea.vn/new.jpg',
        coverPostId: '11',
      });

    await expect(
      uploadProfileMediaWithReconciliation('cover', coverFile, {
        upload: async () =>
          parseProfileMediaUpdateResponse({ api_status: 200 }, 'cover'),
        loadSnapshot,
      }),
    ).resolves.toEqual({
      kind: 'cover',
      url: 'https://cdn.vnseea.vn/new.jpg',
      fullUrl: 'https://cdn.vnseea.vn/new.jpg',
      postId: '11',
      postType: 'profile_cover_picture',
      reconciled: true,
    });
  });

  it('retries reconciliation while the profile endpoint still returns stale media', async () => {
    const oldSnapshot = {
      coverUrl: 'https://cdn.vnseea.vn/old.jpg',
      coverPostId: '10',
    };
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(oldSnapshot)
      .mockResolvedValueOnce(oldSnapshot)
      .mockResolvedValueOnce(oldSnapshot)
      .mockResolvedValueOnce(oldSnapshot)
      .mockResolvedValueOnce(oldSnapshot)
      .mockResolvedValueOnce({
        coverUrl: 'https://cdn.vnseea.vn/new.jpg',
        coverPostId: '11',
      });
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(
      uploadProfileMediaWithReconciliation('cover', coverFile, {
        upload: async () =>
          parseProfileMediaUpdateResponse({ api_status: 200 }, 'cover'),
        loadSnapshot,
        wait,
      }),
    ).resolves.toMatchObject({
      url: 'https://cdn.vnseea.vn/new.jpg',
      postId: '11',
      reconciled: true,
    });
    expect(wait).toHaveBeenCalledTimes(4);
  });

  it('does not reconcile an explicit server rejection', async () => {
    const loadSnapshot = jest.fn().mockResolvedValue({
      coverUrl: 'https://cdn.vnseea.vn/old.jpg',
      coverPostId: '10',
    });

    await expect(
      uploadProfileMediaWithReconciliation('cover', coverFile, {
        upload: async () =>
          parseProfileMediaUpdateResponse(
            { api_status: 422, message: 'Invalid image geometry' },
            'cover',
          ),
        loadSnapshot,
      }),
    ).rejects.toThrow('Invalid image geometry');
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps the upload error when the canonical profile did not change', async () => {
    const snapshot = {
      avatarUrl: 'https://cdn.vnseea.vn/avatar.jpg',
      avatarPostId: '20',
    };

    await expect(
      uploadProfileMediaWithReconciliation('avatar', coverFile, {
        upload: jest.fn().mockRejectedValue(new Error('Network Error')),
        loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      }),
    ).rejects.toThrow('Network Error');
  });
});
