jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://demo.vnseea.vn',
    apiBaseUrl: 'https://demo.vnseea.vn/api',
    serverKey: 'test-server-key',
    requestTimeoutMs: 10000,
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(() => ({
      accessToken: 'test-token',
      userId: 'viewer-1',
    })),
    getAccessToken: jest.fn(() => 'test-token'),
  },
}));

jest.mock('../../../../reels/infrastructure/storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    get: jest.fn(() => null),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import type { CreatePostDraft, FeedPost } from '../../../domain/types/feed.types';
import { createFeedRepository } from '../ApiFeedRepository';

const realPublisher = {
  user_id: 'author-7',
  name: 'Real Name',
  username: 'real-user',
  avatar: 'https://demo.vnseea.vn/real-avatar.jpg',
  url: 'https://demo.vnseea.vn/real-user',
};

function rawPost(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    post_id: id,
    user_id: 'author-7',
    postText: `Post ${id}`,
    postPrivacy: '0',
    privacy_contract: 'audience_v2',
    time: '1781712000',
    postLikes: '0',
    post_comments: '0',
    can_delete: '0',
    can_share: '1',
    publisher: realPublisher,
    ...overrides,
  };
}

async function mapUserPosts(raw: Record<string, unknown>[]) {
  (backendApi.post as jest.Mock).mockResolvedValueOnce({
    api_status: '200',
    data: raw,
  });
  return createFeedRepository().getUserPosts('author-7', 20, '999');
}

function expectRedacted(post: FeedPost) {
  expect(post.isAnonymous).toBe(true);
  expect(post.publisher).toEqual({
    id: '',
    name: '',
    username: '',
  });
  expect(post.publisher).not.toHaveProperty('avatarUrl');
  expect(post.publisher).not.toHaveProperty('profileUrl');
  expect(post.permissions).toEqual({
    canDelete: false,
    canEdit: false,
    canShare: false,
    canShareKnown: true,
  });
}

describe('ApiFeedRepository privacy mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redacts legacy/new anonymous publishers before mapping text, video, and poll posts', async () => {
    const posts = await mapUserPosts([
      rawPost('text-anon', { is_anonymous: '1' }),
      rawPost('video-anon', {
        postPrivacy: '4',
        privacy_contract: undefined,
        postType: 'video',
        postFile: 'https://demo.vnseea.vn/video.mp4',
      }),
      rawPost('poll-anon', {
        is_anonymous: true,
        poll_id: 1,
        options: [
          { id: '1', text: 'A', percentage: '0%', all: 0 },
        ],
      }),
    ]);

    expect(posts).toHaveLength(3);
    posts.forEach(expectRedacted);
  });

  it('keeps owner/deletion state separate from anonymous presentation', async () => {
    const [post] = await mapUserPosts([
      rawPost('owner-anon', {
        user_id: 'viewer-1',
        is_anonymous: '1',
        can_delete: '1',
        publisher: { ...realPublisher, user_id: 'viewer-1' },
      }),
    ]);

    expect(post.publisher).toMatchObject({
      id: 'viewer-1',
      name: 'Real Name',
      username: 'real-user',
    });
    expect(post.permissions).toEqual({
      canDelete: true,
      canEdit: true,
      canShare: false,
      canShareKnown: true,
    });
  });

  it('allows sharing only for explicit backend true, valid public, nonanonymous posts', async () => {
    const posts = await mapUserPosts([
      rawPost('allowed'),
      rawPost('missing', { can_share: undefined }),
      rawPost('explicit-false', { can_share: '0' }),
      rawPost('root-fallback', { permissions: { can_delete: '0' } }),
      rawPost('followers', { postPrivacy: '2' }),
      rawPost('malformed', { postPrivacy: 'wat' }),
      rawPost('anonymous', { is_anonymous: '1' }),
    ]);

    expect(
      posts.map(post => [
        post.id,
        (post as Extract<FeedPost, { privacy: unknown }>).privacy,
        post.permissions?.canShare,
        post.permissions?.canShareKnown,
      ]),
    ).toEqual([
      ['allowed', 'public', true, true],
      ['missing', 'public', false, false],
      ['explicit-false', 'public', false, true],
      ['root-fallback', 'public', true, true],
      ['followers', 'followers', false, true],
      ['malformed', 'only_me', false, true],
      ['anonymous', 'public', false, true],
    ]);
  });
});

describe('ApiFeedRepository create-post privacy contexts', () => {
  const responsePost = rawPost('created', { user_id: 'viewer-1' });

  beforeEach(() => {
    jest.clearAllMocks();
    (backendApi.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      post_data: responsePost,
    });
  });

  function draft(overrides: Partial<CreatePostDraft> = {}): CreatePostDraft {
    return {
      text: 'Hello',
      photos: [],
      privacy: 'public',
      isAnonymous: false,
      ...overrides,
    };
  }

  it('sends the v2 privacy contract for personal and page posts', async () => {
    const repository = createFeedRepository();
    await repository.createPost(draft({ privacy: 'friends' }));
    await repository.createPost(draft({ pageId: '9', privacy: 'followers' }));

    expect((backendApi.multipart as jest.Mock).mock.calls[0][1]).toMatchObject({
      postPrivacy: '1',
      privacy_contract: 'audience_v2',
      is_anonymous: '0',
    });
    expect((backendApi.multipart as jest.Mock).mock.calls[1][1]).toMatchObject({
      page_id: '9',
      postPrivacy: '2',
      privacy_contract: 'audience_v2',
    });
  });

  it.each([
    ['group', { groupId: '4' }],
    ['event', { eventId: '5' }],
  ])('inherits %s privacy and omits all personal privacy fields', async (_label, target) => {
    await createFeedRepository().createPost(
      draft({ ...target, privacy: 'only_me' }),
    );

    const payload = (backendApi.multipart as jest.Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('postPrivacy');
    expect(payload).not.toHaveProperty('privacy_contract');
    expect(payload).not.toHaveProperty('is_anonymous');
  });

  it('rejects non-page audiences and ambiguous composer contexts', async () => {
    const repository = createFeedRepository();

    await expect(
      repository.createPost(draft({ pageId: '9', privacy: 'friends' })),
    ).rejects.toThrow(/page/i);
    await expect(
      repository.createPost(draft({ pageId: '9', eventId: '5' })),
    ).rejects.toThrow(/context/i);
    expect(backendApi.multipart).not.toHaveBeenCalled();
  });

  it('ignores stale anonymous draft state for the new composer', async () => {
    await createFeedRepository().createPost(
      draft({ isAnonymous: true }),
    );

    expect((backendApi.multipart as jest.Mock).mock.calls[0][1]).toMatchObject({
      is_anonymous: '0',
    });
  });
});
