import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import type { ChatItem, MessageAttachment } from '../../../domain/types/messages.types';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.vn',
    mediaBaseUrl: 'https://media.vnseea.vn',
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const multipart = apiBridge.multipart as jest.Mock;

const photo: MessageAttachment = {
  uri: 'file:///photo.jpg',
  name: 'photo.jpg',
  type: 'image/jpeg',
  mediaType: 'image',
  uploadReady: true,
};

const groupChat: ChatItem = {
  id: 'group:7',
  chatId: '7',
  chatType: 'group',
  groupId: '7',
  userId: '7',
  username: '',
  name: 'Nhóm',
  avatar: '',
  lastMessage: '',
  lastMessageTime: 0,
  unreadCount: 0,
  isOnline: false,
  isVerified: false,
};

describe('ApiMessagesRepository media albums', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    multipart.mockResolvedValue({ message_data: [], data: [] });
  });

  it.each([
    { name: 'direct chat', chat: '2' as ChatItem | string },
    { name: 'group chat', chat: groupChat as ChatItem | string },
  ])('sends the album id and size so the server can push once for $name', async ({ chat }) => {
    await createMessagesRepository().sendMessage(chat, '', photo, {
      mediaGroupId: 'media-1-abc',
      mediaGroupSize: 8,
    });

    expect(multipart).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        media_group_id: 'media-1-abc',
        media_group_size: 8,
      }),
    );
  });

  it('sends neither field for a single attachment', async () => {
    await createMessagesRepository().sendMessage('2', '', photo);

    const payload = multipart.mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty('media_group_id');
    expect(payload).not.toHaveProperty('media_group_size');
  });
});
