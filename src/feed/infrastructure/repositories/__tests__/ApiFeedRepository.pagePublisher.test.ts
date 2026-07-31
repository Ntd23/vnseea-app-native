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
      userId: '77',
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
import { createFeedRepository } from '../ApiFeedRepository';

const owner = {
  user_id: '77',
  name: 'Người tạo Trang',
  username: 'page-owner',
  avatar: 'https://demo.vnseea.vn/owner.jpg',
};

const page = {
  id: '9',
  page_id: '9',
  user_id: '77',
  page_title: 'Nhà của thắng',
  page_name: 'nha-cua-thang',
  name: 'Nhà của thắng',
  username: 'nha-cua-thang',
  avatar: 'https://demo.vnseea.vn/page.jpg',
};

function rawPagePost(overrides: Record<string, unknown>) {
  return {
    id: '901',
    post_id: '901',
    page_id: '9',
    postText: 'Bài đăng của Trang',
    postPrivacy: '0',
    privacy_contract: 'audience_v2',
    time: '1785480000',
    postLikes: '0',
    post_comments: '0',
    can_delete: '1',
    can_share: '1',
    ...overrides,
  };
}

describe('ApiFeedRepository Page publisher identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'owner publisher plus page_info',
      rawPagePost({ user_id: '77', publisher: owner, page_info: page }),
    ],
    [
      'Page publisher with empty page_info',
      rawPagePost({ user_id: '0', publisher: page, page_info: [] }),
    ],
  ])('maps %s to the canonical Page identity', async (_label, rawPost) => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [rawPost],
    });

    const [post] = await createFeedRepository().getUserPosts('77', 20, '999');

    expect(post.publisher).toEqual({
      id: '9',
      name: 'Nhà của thắng',
      username: 'nha-cua-thang',
      avatarUrl: 'https://demo.vnseea.vn/page.jpg',
      entityType: 'page',
      pageId: '9',
      ownerId: '77',
    });
  });

  it('keeps Page identity on the post returned immediately after createPost', async () => {
    (backendApi.multipart as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      post_data: rawPagePost({
        user_id: '77',
        publisher: owner,
        page_info: page,
      }),
    });

    const result = await createFeedRepository().createPost({
      text: 'Bài đăng của Trang',
      photos: [],
      privacy: 'public',
      isAnonymous: false,
      pageId: '9',
    });

    expect(result.post.publisher).toMatchObject({
      id: '9',
      name: 'Nhà của thắng',
      avatarUrl: 'https://demo.vnseea.vn/page.jpg',
      entityType: 'page',
      pageId: '9',
      ownerId: '77',
    });
  });

  it('does not treat the backend default page_id=0 as a Page post', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          ...rawPagePost({ user_id: '77', publisher: owner }),
          page_id: '0',
          page_info: [],
        },
      ],
    });

    const [post] = await createFeedRepository().getUserPosts('77', 20, '999');

    expect(post.publisher).toMatchObject({
      id: '77',
      name: 'Người tạo Trang',
      username: 'page-owner',
      avatarUrl: 'https://demo.vnseea.vn/owner.jpg',
    });
    expect(post.publisher).not.toHaveProperty('pageId');
  });
});
