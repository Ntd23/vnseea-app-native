jest.mock('../../../../shared-kernel/infrastructure/api/backendApi', () => ({
  backendApi: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: jest.fn(() => ({ userId: 'owner-1' })),
    },
  }),
);

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.vn',
  },
}));

jest.mock('../../storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    getComment: jest.fn(() => null),
    setComment: jest.fn(),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createReelsRepository } from '../ApiReelsRepository';

const pageComment = {
  id: 'comment-1',
  text: 'Nội dung',
  page_id: '9',
  publisher: {
    user_id: 'owner-1',
    page_id: '9',
    page_name: 'vnseea-page',
    name: 'VNSEEA Page',
  },
  post_onwer: true,
};

describe('ApiReelsRepository Page comment identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends page_id for a Page comment', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: pageComment,
    });

    const result = await createReelsRepository().addComment(
      'post-1',
      'Nội dung',
      undefined,
      undefined,
      { pageId: '9' },
    );

    expect(backendApi.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: 'create',
        post_id: 'post-1',
        page_id: '9',
      }),
    );
    expect(result.publisher).toEqual(
      expect.objectContaining({
        entityType: 'page',
        pageId: '9',
        username: 'vnseea-page',
        name: 'VNSEEA Page',
      }),
    );
    expect(result.postOwner).toBe(true);
  });

  it('sends page_id for a Page reply with media', async () => {
    (backendApi.multipart as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: pageComment,
    });

    await createReelsRepository().addReply(
      'comment-1',
      'Phản hồi',
      { uri: 'file:///reply.jpg', name: 'reply.jpg', type: 'image/jpeg' },
      { pageId: '9' },
    );

    expect(backendApi.multipart).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: 'create_reply',
        comment_id: 'comment-1',
        page_id: '9',
      }),
    );
  });

  it('sends page_id when a Page reacts to a comment', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({ api_status: 200 });

    await createReelsRepository().setCommentReaction(
      'comment-1',
      'love',
      { pageId: '9' },
    );

    expect(backendApi.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: 'reaction_comment',
        comment_id: 'comment-1',
        reaction: '2',
        page_id: '9',
      }),
    );
  });

  it('uses the dedicated endpoint when deleting a reply', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({ api_status: 200 });

    await createReelsRepository().deleteComment('reply-7', 'reply');

    expect(backendApi.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        type: 'delete_reply',
        reply_id: 'reply-7',
      },
    );
  });
});
