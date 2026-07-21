jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(() => ({ userId: 'viewer-1' })),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://demo.vnseea.vn',
  },
}));

jest.mock('../../storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    get: jest.fn(() => null),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createReelsRepository } from '../ApiReelsRepository';

function reel(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    postFile: `https://demo.vnseea.vn/${id}.mp4`,
    postPrivacy: '0',
    publisher: {
      user_id: `author-${id}`,
      username: `author-${id}`,
      name: `Author ${id}`,
    },
    can_share: '1',
    ...overrides,
  };
}

describe('ApiReelsRepository privacy mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes legacy and audience_v2 reel privacy without making unknown data public', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        reel('legacy-2', { postPrivacy: '2', privacy_contract: undefined }),
        reel('v2-2', { postPrivacy: '2', privacy_contract: 'audience_v2' }),
        reel('v2-3', { postPrivacy: '3', privacy_contract: 'audience_v2' }),
        reel('missing', { postPrivacy: undefined, privacy_contract: undefined }),
      ],
      has_more: false,
      next_cursor: null,
    });

    const { items } = await createReelsRepository().fetchReels({ limit: 10 });

    expect(items.map(item => [item.id, item.privacy, item.privacyContract])).toEqual([
      ['legacy-2', 'only_me', 'legacy_reel'],
      ['v2-2', 'followers', 'audience_v2'],
      ['v2-3', 'only_me', 'audience_v2'],
      ['missing', 'only_me', 'legacy_reel'],
    ]);
    expect(items.map(item => item.canShare)).toEqual([false, false, false, false]);
  });

  it('sets canShare only for explicit true public nonanonymous reels', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        reel('allowed', { privacy_contract: 'audience_v2' }),
        reel('missing-permission', {
          privacy_contract: 'audience_v2',
          can_share: undefined,
        }),
        reel('anonymous', {
          privacy_contract: 'audience_v2',
          is_anonymous: '1',
        }),
      ],
      has_more: false,
      next_cursor: null,
    });

    const { items } = await createReelsRepository().fetchReels({ limit: 10 });
    expect(items.map(item => item.canShare)).toEqual([true, false, false]);
  });

  it('normalizes relative reel media URLs and encodes spaces before playback', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        reel('relative-media', {
          postFile: 'upload/videos/reel sample.mp4',
          video_thumb: '/upload/photos/reel cover.jpg',
          publisher: {
            user_id: 'author-relative',
            username: 'author-relative',
            name: 'Author Relative',
            avatar: 'upload/photos/avatar sample.jpg',
          },
        }),
      ],
      has_more: false,
      next_cursor: null,
    });

    const { items } = await createReelsRepository().fetchReels({ limit: 10 });
    const siteRoot = 'https://demo.vnseea.vn';

    expect(items[0]).toMatchObject({
      videoUrl: `${siteRoot}/upload/videos/reel%20sample.mp4`,
      thumbnailUrl: `${siteRoot}/upload/photos/reel%20cover.jpg`,
      publisher: {
        avatarUrl: `${siteRoot}/upload/photos/avatar%20sample.jpg`,
      },
    });
  });

  it('keeps scanning legacy sparse pages until it fills the playable reel page', async () => {
    (backendApi.post as jest.Mock)
      .mockResolvedValueOnce({
        api_status: 200,
        data: [
          { id: '30', postYoutube: 'https://youtube.com/watch?v=demo' },
          reel('29'),
        ],
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: [reel('20'), reel('19')],
      });

    const page = await createReelsRepository().fetchReels({ limit: 3 });

    expect(page.items.map(item => item.id)).toEqual(['29', '20', '19']);
    expect(backendApi.post).toHaveBeenCalledTimes(2);
    expect(backendApi.post).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ after_post_id: '29' }),
    );
  });

  it('stops when the server explicitly reports the final reel page', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [reel('10')],
      has_more: false,
      next_cursor: null,
    });

    const page = await createReelsRepository().fetchReels({ limit: 20 });

    expect(page.items.map(item => item.id)).toEqual(['10']);
    expect(page.nextCursor).toBeNull();
    expect(backendApi.post).toHaveBeenCalledTimes(1);
  });

  it('continues after an empty mapped page when the server supplies another cursor', async () => {
    (backendApi.post as jest.Mock)
      .mockResolvedValueOnce({
        api_status: 200,
        data: [],
        has_more: true,
        next_cursor: '50',
      })
      .mockResolvedValueOnce({
        api_status: 200,
        data: [reel('49')],
        has_more: false,
        next_cursor: null,
      });

    const page = await createReelsRepository().fetchReels({ limit: 20 });

    expect(page.items.map(item => item.id)).toEqual(['49']);
    expect(page.nextCursor).toBeNull();
    expect(backendApi.post).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ after_post_id: '50' }),
    );
  });
});
