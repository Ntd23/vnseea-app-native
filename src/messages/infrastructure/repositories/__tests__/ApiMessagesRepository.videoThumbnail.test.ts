import { prepareVideoForUpload } from '../../../../shared-kernel/application/services/videoProcessing';
import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import type { ChatItem } from '../../../domain/types/messages.types';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock(
  '../../../../shared-kernel/application/services/videoProcessing',
  () => ({
    prepareVideoForUpload: jest.fn(),
  }),
);

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
const prepareVideo = prepareVideoForUpload as jest.Mock;

const attachment = {
  uri: 'file:///selected.mov',
  name: 'selected.mov',
  type: 'video/quicktime',
  mediaType: 'video' as const,
  thumbnailUri: 'file:///selected-thumb.jpg',
  thumbnailName: 'selected-thumb.jpg',
  thumbnailType: 'image/jpeg',
};

const preparedAttachment = {
  ...attachment,
  uri: 'file:///prepared.mp4',
  name: 'prepared.mp4',
  type: 'video/mp4',
};

function rawVideoMessage(groupId?: string) {
  return {
    id: '91',
    from_id: '1',
    to_id: groupId ? '0' : '2',
    group_id: groupId || '0',
    media: 'upload/videos/prepared.mp4',
    media_thumb: 'https://media.vnseea.vn/upload/photos/server-thumb.jpg',
    type_two: 'video',
    or_text: '',
    time: 100,
    seen: 0,
  };
}

describe('ApiMessagesRepository video thumbnails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prepareVideo.mockResolvedValue(preparedAttachment);
  });

  it.each([
    {
      name: 'direct chat',
      chat: '2',
      response: { message_data: [rawVideoMessage()] },
    },
    {
      name: 'group chat',
      chat: {
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
      } satisfies ChatItem,
      response: { data: [rawVideoMessage('7')] },
    },
  ])('uploads and maps a canonical poster for $name', async ({ chat, response }) => {
    multipart.mockResolvedValueOnce(response);

    const result = await createMessagesRepository().sendMessage(
      chat,
      '',
      attachment,
    );

    expect(prepareVideo).toHaveBeenCalledWith(
      attachment,
      expect.objectContaining({ minimumFileSizeForCompress: 0 }),
    );
    expect(multipart).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        file: preparedAttachment,
        message_type: 'video',
        video_thumb: {
          uri: attachment.thumbnailUri,
          name: attachment.thumbnailName,
          type: attachment.thumbnailType,
        },
      }),
    );
    expect(result.sentMessages?.[0]?.thumbnail).toBe(
      'https://media.vnseea.vn/upload/photos/server-thumb.jpg',
    );
  });
});
