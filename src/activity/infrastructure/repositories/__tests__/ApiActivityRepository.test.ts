jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://demo.vnseea.vn/api',
  WEB_BASE_URL: 'https://demo.vnseea.vn',
  SERVER_KEY: 'test-server-key',
  REQUEST_TIMEOUT_MS: '10000',
}));
jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: { post: jest.fn() },
}));

import { mapPostActivityPage } from '../ApiActivityRepository';

describe('mapPostActivityPage', () => {
  it('maps comment metadata and a compact post preview', () => {
    const page = mapPostActivityPage({
      api_status: 200,
      data: [
        {
          id: 'comment:42',
          post_id: '42',
          category: 'comment',
          interaction_count: 3,
          latest_comment_text: 'Bình luận gần nhất',
          action_time: 1234,
          post_data: {
            id: '42',
            postText: '<b>Nội dung bài viết</b>',
            time: 1200,
            postFile: 'https://cdn.example.com/photo.jpg',
            publisher: {
              user_id: '7',
              name: 'Nguyễn An',
              username: 'nguyenan',
              avatar: 'https://cdn.example.com/avatar.jpg',
            },
          },
        },
      ],
      next_cursor: 'next',
      has_more: true,
    });

    expect(page.nextCursor).toBe('next');
    expect(page.hasMore).toBe(true);
    expect(page.items[0]).toMatchObject({
      id: 'comment:42',
      postId: '42',
      category: 'comment',
      title: 'Nội dung bài viết',
      author: 'Nguyễn An',
      imageUrl: 'https://cdn.example.com/photo.jpg',
      interactionCount: 3,
      latestCommentText: 'Bình luận gần nhất',
      actionAt: 1234,
    });
  });

  it('keeps reaction and share metadata without inventing action time', () => {
    const page = mapPostActivityPage({
      api_status: 200,
      data: [
        {
          id: 'reaction:8',
          post_id: '8',
          category: 'reaction',
          reaction_type: '2',
          post_data: { id: '8', postText: 'Reaction post', publisher: { name: 'A' } },
        },
        {
          id: 'share:9',
          post_id: '9',
          category: 'share',
          share_destination: 'group',
          post_data: { id: '9', postText: 'Shared post', publisher: { name: 'B' } },
        },
      ],
      has_more: false,
    });

    expect(page.items[0]).toMatchObject({ reaction: 'love', actionAt: undefined });
    expect(page.items[1]).toMatchObject({ shareDestination: 'group' });
  });
});
