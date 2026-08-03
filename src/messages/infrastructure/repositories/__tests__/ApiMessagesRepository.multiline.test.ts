import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: { webBaseUrl: 'https://vnseea.vn' },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const post = apiBridge.post as jest.Mock;

function rawMessage(text: string) {
  return {
    id: '91',
    from_id: '2',
    to_id: '1',
    or_text: text,
    time: 100,
    seen: 1,
  };
}

describe('ApiMessagesRepository multiline messages', () => {
  beforeEach(() => post.mockReset());

  it('restores server HTML and legacy line-break markers', async () => {
    post.mockResolvedValueOnce({
      messages: [
        rawMessage(
          'Dòng 1<br>Dòng 2<br />Dòng 3[nl]Dòng 4\\nDòng 5&lt;br&gt;Dòng 6',
        ),
      ],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.message).toBe(
      'Dòng 1\nDòng 2\nDòng 3\nDòng 4\nDòng 5\nDòng 6',
    );
  });

  it('keeps real newline characters from the API response', async () => {
    post.mockResolvedValueOnce({
      messages: [rawMessage('Dòng đầu\nDòng giữa\nDòng cuối')],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.message).toBe('Dòng đầu\nDòng giữa\nDòng cuối');
  });

  it('serializes multiline one-to-one messages for the legacy PHP API', async () => {
    post.mockResolvedValueOnce({
      message_data: [
        {
          ...rawMessage('67 68 68'),
          from_id: '1',
          to_id: '2',
        },
      ],
    });

    const response = await createMessagesRepository().sendMessage(
      '2',
      '67\n68\n68',
    );

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: '2',
        text: '67\\n68\\n68',
      }),
    );
    expect(response.sentMessages?.[0].message).toBe('67\n68\n68');
  });
});
