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
      getSession: jest.fn(() => ({ userId: 'viewer-1' })),
    },
  }),
);

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://demo.vnseea.vn',
  },
}));

jest.mock('../../storage/reelsReactionsStorage', () => ({
  reelsReactionsStorage: {
    getComment: jest.fn(() => null),
  },
}));

import { backendApi } from '../../../../shared-kernel/infrastructure/api/backendApi';
import { createReelsRepository } from '../ApiReelsRepository';

const publisher = {
  user_id: 'author-1',
  username: 'author',
  name: 'Author',
};

describe('ApiReelsRepository comment mention mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates camelCase mention fields from object-shaped payloads', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          id: 'comment-1',
          mentionText: 'Chào @[42]',
          mentions: {
            42: {
              userId: '42',
              userName: 'nguyen-an',
              displayName: 'Nguyễn Văn An',
            },
          },
          publisher,
        },
      ],
    });

    const comments = await createReelsRepository().getComments('post-1');

    expect(comments[0]).toMatchObject({
      text: 'Chào @Nguyễn Văn An',
      mentions: [
        {
          userId: '42',
          username: 'nguyen-an',
          displayName: 'Nguyễn Văn An',
        },
      ],
    });
  });

  it('keeps associative username-to-name payloads as styleable mentions', async () => {
    (backendApi.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [
        {
          id: 'comment-2',
          mention_text: 'Cảm ơn @mai_anh',
          mentions_users: {
            mai_anh: 'Mai Anh',
          },
          publisher,
        },
      ],
    });

    const comments = await createReelsRepository().getComments('post-1');

    expect(comments[0]).toMatchObject({
      text: 'Cảm ơn @Mai Anh',
      mentions: [
        {
          userId: '',
          username: 'mai_anh',
          displayName: 'Mai Anh',
        },
      ],
    });
  });
});
