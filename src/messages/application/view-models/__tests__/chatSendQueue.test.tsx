import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type {
  ChatItem,
  MessageAttachment,
  MessageItem,
  SendMessageOptions,
} from '../../../domain/types/messages.types';
import type { ChatMediaPreparationHandle } from '../../media/chatMediaPreparation';
import { compareMessageIds, useChatViewModel } from '../useChatViewModel';

jest.mock('../../../infrastructure/repositories/ApiMessagesRepository', () => {
  const repository = {
    getMessages: jest.fn(),
    markAsSeen: jest.fn(),
    sendMessage: jest.fn(),
  };
  return {
    __mockRepository: repository,
    createMessagesRepository: () => repository,
  };
});

jest.mock('../../../infrastructure/realtime/liveKitCallRealtime', () => ({
  emitChatTyping: jest.fn(),
  emitChatTypingDone: jest.fn(),
  getWebTypingState: jest.fn().mockResolvedValue(null),
  onChatTyping: jest.fn(() => jest.fn()),
  updateWebTypingState: jest.fn(),
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

jest.mock(
  '../../../../shared-kernel/application/stores/unreadBadgeStore',
  () => ({ setUnreadBadgeCounts: jest.fn() }),
);

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: { webBaseUrl: 'https://vnseea.vn' },
}));

const mockRepository = jest.requireMock(
  '../../../infrastructure/repositories/ApiMessagesRepository',
).__mockRepository as {
  getMessages: jest.Mock;
  markAsSeen: jest.Mock;
  sendMessage: jest.Mock;
};

const chat: ChatItem = {
  id: '2',
  chatType: 'user',
  participantId: '2',
  userId: '2',
  username: 'partner',
  name: 'Partner',
  avatar: '',
  lastMessage: '',
  lastMessageTime: 0,
  unreadCount: 0,
  isOnline: true,
  isVerified: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function serverMessage(id: string, media: string): MessageItem {
  return {
    id,
    conversationId: '2',
    fromId: '1',
    toId: '2',
    message: '',
    media,
    mediaType: 'image',
    time: Math.floor(Date.now() / 1000),
    isSentByMe: true,
    seen: 0,
    reactions: { total: 0, myReaction: null, topReactions: [], breakdown: {} },
  };
}

const photo = (index: number): MessageAttachment => ({
  uri: `file:///picked-${index}.jpg`,
  name: `picked-${index}.jpg`,
  type: 'image/jpeg',
  mediaType: 'image',
});

async function renderViewModel() {
  let viewModel!: ReturnType<typeof useChatViewModel>;
  function Probe() {
    viewModel = useChatViewModel(chat);
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
  });
  await act(async () => {
    await viewModel.loadInitial();
  });
  return { get: () => viewModel, renderer };
}

describe('useChatViewModel send queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.sendMessage.mockReset();
    mockRepository.getMessages.mockResolvedValue([]);
    mockRepository.markAsSeen.mockResolvedValue(undefined);
  });

  it('shows every bubble at once and delivers them one at a time in order', async () => {
    const first = deferred<{ sentMessages: MessageItem[] }>();
    const second = deferred<{ sentMessages: MessageItem[] }>();
    mockRepository.sendMessage
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { get, renderer } = await renderViewModel();

    let batch!: Promise<boolean[]>;
    await act(async () => {
      batch = get().sendMessageBatch([
        { text: 'Hai ảnh', attachment: photo(1), options: { mediaGroupId: 'g' } },
        { text: '', attachment: photo(2), options: { mediaGroupId: 'g' } },
      ]);
      await Promise.resolve();
    });

    expect(get().messages.map(message => message.media)).toEqual([
      'file:///picked-1.jpg',
      'file:///picked-2.jpg',
    ]);
    expect(get().messages.every(message => message.deliveryState === 'sending')).toBe(true);
    expect(mockRepository.sendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve({ sentMessages: [serverMessage('101', 'https://media/1.jpg')] });
      await first.promise;
    });
    expect(mockRepository.sendMessage).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ sentMessages: [serverMessage('102', 'https://media/2.jpg')] });
      await batch;
    });
    expect(get().messages.map(message => message.id)).toEqual(['101', '102']);
    expect(get().messages.every(message => message.mediaGroupId === 'g')).toBe(true);
    expect(get().isSending).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('waits for background preparation, then reports upload progress', async () => {
    const prepared = deferred<MessageAttachment>();
    const progressListeners = new Set<(progress: number) => void>();
    const preparation: ChatMediaPreparationHandle = {
      result: prepared.promise,
      getProgress: () => 0.3,
      subscribeProgress: listener => {
        progressListeners.add(listener);
        return () => progressListeners.delete(listener);
      },
    };
    const upload = deferred<{ sentMessages: MessageItem[] }>();
    let uploadOptions: SendMessageOptions | undefined;
    mockRepository.sendMessage.mockImplementationOnce(
      (_chat, _text, _attachment, options) => {
        uploadOptions = options;
        return upload.promise;
      },
    );
    const video: MessageAttachment = {
      uri: 'file:///picked.mov',
      name: 'picked.mov',
      type: 'video/quicktime',
      mediaType: 'video',
    };
    const { get, renderer } = await renderViewModel();

    let batch!: Promise<boolean[]>;
    await act(async () => {
      batch = get().sendMessageBatch([{ text: '', attachment: video, preparation }]);
      await Promise.resolve();
    });
    expect(get().messages[0]?.sendProgress).toEqual({
      phase: 'preparing',
      progress: 0.3,
    });

    await act(async () => {
      progressListeners.forEach(listener => listener(0.6));
    });
    expect(get().messages[0]?.sendProgress).toEqual({
      phase: 'preparing',
      progress: 0.6,
    });
    expect(mockRepository.sendMessage).not.toHaveBeenCalled();

    const readyVideo: MessageAttachment = {
      ...video,
      uri: 'file:///small.mp4',
      type: 'video/mp4',
      thumbnailUri: 'file:///poster.jpg',
      uploadReady: true,
    };
    await act(async () => {
      prepared.resolve(readyVideo);
      await prepared.promise;
    });
    expect(mockRepository.sendMessage).toHaveBeenCalledWith(
      chat,
      '',
      readyVideo,
      expect.objectContaining({ onUploadProgress: expect.any(Function) }),
    );
    expect(get().messages[0]?.thumbnail).toBe('file:///poster.jpg');

    await act(async () => {
      uploadOptions?.onUploadProgress?.(0.5);
    });
    expect(get().messages[0]?.sendProgress).toEqual({
      phase: 'uploading',
      progress: 0.5,
    });

    await act(async () => {
      upload.resolve({
        sentMessages: [
          { ...serverMessage('201', 'https://media/v.mp4'), mediaType: 'video' },
        ],
      });
      await batch;
    });
    expect(get().messages).toHaveLength(1);
    expect(get().messages[0]).toEqual(
      expect.objectContaining({
        id: '201',
        thumbnail: 'file:///poster.jpg',
      }),
    );
    expect(get().messages[0]?.deliveryState).toBeUndefined();
    await act(async () => renderer.unmount());
  });

  it('marks only the failed message and keeps delivering the rest', async () => {
    mockRepository.sendMessage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ sentMessages: [serverMessage('301', 'https://media/2.jpg')] });
    const { get, renderer } = await renderViewModel();

    let results!: boolean[];
    await act(async () => {
      results = await get().sendMessageBatch([
        { text: '', attachment: photo(1) },
        { text: '', attachment: photo(2) },
      ]);
    });

    expect(results).toEqual([false, true]);
    const failed = get().messages.filter(
      message => message.deliveryState === 'failed',
    );
    expect(failed).toHaveLength(1);
    expect(failed[0]?.media).toBe('file:///picked-1.jpg');
    expect(failed[0]?.sendProgress).toBeUndefined();
    expect(get().messages.map(message => message.id)).toContain('301');
    await act(async () => renderer.unmount());
  });
});

describe('compareMessageIds', () => {
  it('orders server ids numerically and pending ids after them in send order', () => {
    const ids = [
      'pending-1720000000000-000002',
      '12',
      'pending-1720000000000-000001',
      '9',
    ];
    expect([...ids].sort(compareMessageIds)).toEqual([
      '9',
      '12',
      'pending-1720000000000-000001',
      'pending-1720000000000-000002',
    ]);
  });
});
