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
      userId: '1',
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
import type { CreatePostDraft } from '../../../domain/types/feed.types';
import { createFeedRepository, mapFeedPost } from '../ApiFeedRepository';

const publisher = {
  user_id: '1',
  name: 'Nam',
  username: 'nam',
  avatar: 'https://demo.vnseea.vn/nam.jpg',
};

describe('ApiFeedRepository post metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends canonical tagged users, location and feeling and maps them on video', async () => {
    (backendApi.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      post_data: {
        id: '90',
        post_id: '90',
        user_id: '1',
        postType: 'video',
        postFile: 'https://demo.vnseea.vn/post.mp4',
        postFileThumb: 'https://demo.vnseea.vn/post.jpg',
        postText: 'Xin chào',
        postPrivacy: '0',
        privacy_contract: 'audience_v2',
        postFeeling: 'happy',
        postMap: 'Hà Nội',
        tagged_users: [
          {
            user_id: '11',
            name: 'Nguyễn Văn A',
            username: 'nguyenvana',
            avatar: 'https://demo.vnseea.vn/a.jpg',
          },
          {
            user_id: '12',
            name: 'Trần Văn B',
            username: 'tranvanb',
          },
        ],
        time: '1781712000',
        postLikes: '0',
        post_comments: '0',
        can_delete: '1',
        can_share: '1',
        publisher,
      },
    });

    const draft: CreatePostDraft = {
      text: 'Xin chào',
      photos: [],
      video: {
        uri: 'file:///post.mp4',
        name: 'post.mp4',
        type: 'video/mp4',
      },
      privacy: 'public',
      isAnonymous: true,
      feeling: { type: 'feelings', value: 'happy' },
      taggedUsers: [
        {
          id: '11',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
        },
        {
          id: '12',
          name: 'Trần Văn B',
          username: 'tranvanb',
        },
      ],
      location: { label: 'Hà Nội' },
    };

    const result = await createFeedRepository().createPost(draft);
    const payload = (backendApi.multipart as jest.Mock).mock.calls[0][1];

    expect(payload).toMatchObject({
      tagged_user_ids: JSON.stringify(['11', '12']),
      postMap: 'Hà Nội',
      feeling_type: 'feelings',
      feeling: 'happy',
      is_anonymous: '0',
    });
    expect(result.post).toMatchObject({
      kind: 'video',
      feeling: { type: 'feelings', value: 'happy' },
      location: { label: 'Hà Nội' },
      taggedUsers: [
        {
          id: '11',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          avatarUrl: 'https://demo.vnseea.vn/a.jpg',
        },
        {
          id: '12',
          name: 'Trần Văn B',
          username: 'tranvanb',
        },
      ],
    });
  });

  it('keeps user-entered line breaks when creating and mapping a post', async () => {
    const multilineText = 'Dòng đầu tiên\nDòng thứ hai\n\nĐoạn tiếp theo';
    (backendApi.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      post_data: {
        id: '91',
        post_id: '91',
        user_id: '1',
        Orginaltext: multilineText,
        postText: multilineText,
        postPrivacy: '0',
        time: '1781712000',
        postLikes: '0',
        post_comments: '0',
        can_delete: '1',
        can_share: '1',
        publisher,
      },
    });

    const result = await createFeedRepository().createPost({
      text: multilineText,
      photos: [],
      privacy: 'public',
      isAnonymous: false,
      taggedUsers: [],
    });
    const payload = (backendApi.multipart as jest.Mock).mock.calls[0][1];

    expect(payload.postText).toBe(multilineText);
    expect(result.post).toMatchObject({
      kind: 'text',
      caption: multilineText,
    });
  });

  it('converts API HTML line breaks back to native text line breaks', () => {
    const mapped = mapFeedPost({
      id: '92',
      post_id: '92',
      user_id: '1',
      postText_API:
        'Dòng đầu tiên<br>Dòng thứ hai<br><br>Đoạn tiếp theo',
      postPrivacy: '0',
      time: '1781712000',
      postLikes: '0',
      post_comments: '0',
      publisher,
    });

    expect(mapped).toMatchObject({
      kind: 'text',
      caption: 'Dòng đầu tiên\nDòng thứ hai\n\nĐoạn tiếp theo',
    });
  });

  it('maps canonical video geometry supplied by the server', () => {
    const mapped = mapFeedPost({
      id: '93',
      post_id: '93',
      user_id: '1',
      postType: 'video',
      postFile: 'https://demo.vnseea.vn/post.mp4',
      postFileThumb: 'https://demo.vnseea.vn/post.jpg',
      media_geometry: { width: 1080, height: 1920 },
      postPrivacy: '0',
      time: '1781712000',
      postLikes: '0',
      post_comments: '0',
      publisher,
    });

    expect(mapped).toMatchObject({
      kind: 'video',
      mediaGeometry: {
        width: 1080,
        height: 1920,
        aspectRatio: 0.5625,
      },
    });
  });

  it('searches taggable people with the current audience and context', async () => {
    (backendApi.post as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: [
        {
          user_id: '11',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          avatar: 'https://demo.vnseea.vn/a.jpg',
        },
      ],
      next_cursor: '40',
      has_more: true,
    });

    const page = await createFeedRepository().getTaggableUsers({
      query: 'Nguyễn',
      privacy: 'followers',
      pageId: '8',
    });

    expect(backendApi.post).toHaveBeenCalledWith(
      'post-taggable-users',
      expect.objectContaining({
        query: 'Nguyễn',
        postPrivacy: '2',
        privacy_contract: 'audience_v2',
        page_id: '8',
        limit: 20,
      }),
    );
    expect(page).toEqual({
      users: [
        {
          id: '11',
          name: 'Nguyễn Văn A',
          username: 'nguyenvana',
          avatarUrl: 'https://demo.vnseea.vn/a.jpg',
        },
      ],
      nextCursor: '40',
      hasMore: true,
    });
  });
});
