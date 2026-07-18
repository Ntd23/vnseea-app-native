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
    });

    const { items } = await createReelsRepository().fetchReels({ limit: 10 });
    expect(items.map(item => item.canShare)).toEqual([true, false, false]);
  });
});
