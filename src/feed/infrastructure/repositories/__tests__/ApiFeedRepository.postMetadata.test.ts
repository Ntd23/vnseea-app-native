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
        media_geometry: { width: 1920, height: 1080 },
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
        width: 1920,
        height: 1080,
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
      media_width: 1920,
      media_height: 1080,
    });
    expect(result.post).toMatchObject({
      kind: 'video',
      mediaGeometry: {
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
      },
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

  it('keeps ordered photo geometry in upload payloads and mapped posts', async () => {
    (backendApi.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      post_data: {
        id: '94',
        post_id: '94',
        user_id: '1',
        postPrivacy: '0',
        album_name: 'Post',
        photo_album: [
          {
            image: 'https://demo.vnseea.vn/a.jpg',
            media_geometry: { width: 1200, height: 800 },
          },
          {
            image: 'https://demo.vnseea.vn/b.jpg',
            media_geometry: { width: 900, height: 1200 },
          },
        ],
        time: '1781712000',
        postLikes: '0',
        post_comments: '0',
        publisher,
      },
    });

    const result = await createFeedRepository().createPost({
      text: '',
      photos: [
        {
          uri: 'file:///a.jpg',
          name: 'a.jpg',
          type: 'image/jpeg',
          width: 1200,
          height: 800,
        },
        {
          uri: 'file:///b.jpg',
          name: 'b.jpg',
          type: 'image/jpeg',
          width: 900,
          height: 1200,
        },
      ],
      privacy: 'public',
    });
    const payload = (backendApi.multipart as jest.Mock).mock.calls[0][1];

    expect(JSON.parse(payload.photo_media_geometry)).toEqual([
      { width: 1200, height: 800 },
      { width: 900, height: 1200 },
    ]);
    expect(result.post).toMatchObject({
      kind: 'text',
      photoGeometries: [
        { width: 1200, height: 800, aspectRatio: 1.5 },
        { width: 900, height: 1200, aspectRatio: 0.75 },
      ],
    });
  });

  it('does not forward an oversized iOS asset filename to the post API', async () => {
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(1786091832000);
    (backendApi.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      post_data: {
        id: '93',
        post_id: '93',
        user_id: '1',
        postType: 'video',
        postFile: 'https://demo.vnseea.vn/post.mp4',
        postPrivacy: '0',
        time: '1786091832',
        postLikes: '0',
        post_comments: '0',
        can_delete: '1',
        can_share: '1',
        publisher,
      },
    });

    await createFeedRepository().createPost({
      text: '',
      photos: [],
      video: {
        uri: 'file:///post.mp4',
        name: `snapvideo--${'%20caption'.repeat(40)}.mp4`,
        type: 'video/mp4',
      },
      privacy: 'public',
      isAnonymous: false,
    });

    const payload = (backendApi.multipart as jest.Mock).mock.calls[0][1];
    expect(payload.postVideo.name).toBe('video-1786091832000.mp4');
    dateNow.mockRestore();
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
