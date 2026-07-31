jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://v2.vnseea.test',
    apiBaseUrl: 'https://v2.vnseea.test/api',
    serverKey: 'test-server-key',
    requestTimeoutMs: 10000,
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: jest.fn(() => ({ userId: 'viewer-1' })),
    },
  }),
);

jest.mock(
  '../../../../reels/infrastructure/storage/reelsReactionsStorage',
  () => ({
    reelsReactionsStorage: {
      get: jest.fn(() => null),
    },
  }),
);

import { mapFeedPost } from '../ApiFeedRepository';

const groupRecipient = {
  group_id: '27',
  group_name: 'hoi-meme-vui',
  group_title: 'Hội Meme video hài bựa',
  avatar: 'upload/photos/group-avatar.jpg',
  cover: 'https://cdn.vnseea.test/group-cover.jpg',
  url: 'https://v2.vnseea.test/hoi-meme-vui',
  privacy: '1',
};

const publisher = {
  user_id: '19',
  name: 'Peter Nguyen',
  username: 'peter',
  avatar: 'https://cdn.vnseea.test/peter.jpg',
};

function basePost(id: string) {
  return {
    id,
    post_id: id,
    group_id: '27',
    group_recipient: groupRecipient,
    publisher,
    postText: 'Bài đăng trong nhóm',
    postPrivacy: '0',
    time: '1785510000',
    postLikes: '3',
    post_comments: '2',
    can_share: '1',
  };
}

describe('ApiFeedRepository group post context', () => {
  it.each([
    ['text', basePost('101')],
    [
      'video',
      {
        ...basePost('102'),
        postType: 'video',
        postFile: 'https://cdn.vnseea.test/group-video.mp4',
      },
    ],
    [
      'poll',
      {
        ...basePost('103'),
        poll_id: '1',
        options: [{ id: '1', text: 'Có', option_votes: 0 }],
      },
    ],
  ])('maps group identity for %s posts', (_kind, raw) => {
    const post = mapFeedPost(raw);

    expect(post.groupContext).toEqual({
      id: '27',
      title: 'Hội Meme video hài bựa',
      username: 'hoi-meme-vui',
      avatarUrl: 'https://v2.vnseea.test/upload/photos/group-avatar.jpg',
      coverUrl: 'https://cdn.vnseea.test/group-cover.jpg',
      url: 'https://v2.vnseea.test/hoi-meme-vui',
      privacy: 'public',
    });
    expect(post.publisher).toMatchObject({
      id: '19',
      name: 'Peter Nguyen',
      avatarUrl: 'https://cdn.vnseea.test/peter.jpg',
    });
  });
});
