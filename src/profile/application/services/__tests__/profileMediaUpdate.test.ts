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
