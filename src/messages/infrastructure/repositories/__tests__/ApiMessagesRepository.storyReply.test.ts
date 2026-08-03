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

const storySnapshot = {
  id: '45',
  user_id: '2',
  story_type: 'media',
  title: 'Buổi sáng',
  description: 'Một ngày mới',
  thumbnail: 'https://cdn.vnseea.vn/story-45.jpg',
  user_data: {
    user_id: '2',
    name: 'Người đăng',
    avatar: 'https://cdn.vnseea.vn/avatar.jpg',
  },
};

function rawStoryReply(overrides: Record<string, unknown> = {}) {
  return {
    id: '91',
    from_id: '2',
    to_id: '1',
    or_text: 'Đẹp quá!',
    type_two: 'story_reply',
    story_id: '45',
    story_available: true,
    story: storySnapshot,
    time: 100,
    seen: 1,
    ...overrides,
  };
}

describe('ApiMessagesRepository Story replies', () => {
  beforeEach(() => post.mockReset());

  it('maps an available Story preview in a direct message', async () => {
    post.mockResolvedValueOnce({ messages: [rawStoryReply()] });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.contentKind).toBe('story');
    expect(message.storyReply).toEqual({
      storyId: '45',
      publisherId: '2',
      publisherName: 'Người đăng',
      publisherAvatar: 'https://cdn.vnseea.vn/avatar.jpg',
      mediaType: 'image',
      thumbnailUrl: 'https://cdn.vnseea.vn/story-45.jpg',
      caption: 'Một ngày mới',
      available: true,
    });
  });

  it('keeps the reply text when the Story is unavailable', async () => {
    post.mockResolvedValueOnce({
      messages: [
        rawStoryReply({ story_available: false, story: {} }),
      ],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.message).toBe('Đẹp quá!');
    expect(message.storyReply).toEqual(
      expect.objectContaining({ storyId: '45', available: false }),
    );
  });

  it('maps Story metadata inside a nested message reply', async () => {
    post.mockResolvedValueOnce({
      messages: [
        {
          id: '92',
          from_id: '1',
          to_id: '2',
          or_text: 'Tôi cũng vậy',
          time: 101,
          reply: rawStoryReply(),
        },
      ],
    });

    const [message] = await createMessagesRepository().getMessages('2');

    expect(message.replyTo?.contentKind).toBe('story');
    expect(message.replyTo?.storyReply).toEqual(
      expect.objectContaining({ storyId: '45', available: true }),
    );
  });

  it('sends story_id and preserves the optimistic Story reference', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      message_data: [rawStoryReply({ story: {}, story_available: false })],
    });
    const optimisticStory = {
      storyId: '45',
      publisherId: '2',
      publisherName: 'Người đăng',
      publisherAvatar: 'https://cdn.vnseea.vn/avatar.jpg',
      mediaType: 'image' as const,
      thumbnailUrl: 'https://cdn.vnseea.vn/story-45.jpg',
      caption: 'Một ngày mới',
      available: true,
    };

    const response = await createMessagesRepository().sendMessage(
      '2',
      'Đẹp quá!',
      undefined,
      { storyReply: optimisticStory },
    );

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        user_id: '2',
        text: 'Đẹp quá!',
        story_id: '45',
      }),
    );
    expect(response.sentMessages?.[0].storyReply).toEqual(optimisticStory);
  });

  it('uses a Story-specific latest-message preview', async () => {
    post.mockResolvedValueOnce({
      data: [
        {
          chat_type: 'user',
          chat_id: '2',
          user_data: { user_id: '2', name: 'Người đăng' },
          last_message: rawStoryReply(),
        },
      ],
    });

    const [chat] = await createMessagesRepository().getChats({
      includeDiscovery: false,
      latestOnly: true,
    });

    expect(chat.lastMessageKind).toBe('story');
    expect(chat.lastMessage).toBe('Đã trả lời tin của bạn');
  });
});
