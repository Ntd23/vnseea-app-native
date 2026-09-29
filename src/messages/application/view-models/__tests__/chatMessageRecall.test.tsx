import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { ChatItem, MessageItem } from '../../../domain/types/messages.types';
import { useChatViewModel } from '../useChatViewModel';

jest.mock('../../../infrastructure/repositories/ApiMessagesRepository', () => {
  const repository = {
    getMessages: jest.fn(),
    markAsSeen: jest.fn(),
    recallMessage: jest.fn(),
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
  recallMessage: jest.Mock;
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

const initialMessage: MessageItem = {
  id: '10',
  conversationId: '2',
  fromId: '1',
  toId: '2',
  message: 'Xin chao',
  media: 'https://media.vnseea.vn/upload/photos/example.jpg',
  mediaType: 'image',
  time: 100,
  isSentByMe: true,
  seen: 1,
  reactions: {
    total: 1,
    myReaction: 'like',
    topReactions: ['like'],
    breakdown: { like: 1 },
  },
};

describe('useChatViewModel message recall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.getMessages.mockResolvedValue([initialMessage]);
    mockRepository.markAsSeen.mockResolvedValue(undefined);
  });

  it('updates optimistically and blocks a duplicate recall', async () => {
    let resolveRecall!: (value: {
      messageId: string;
      recalledAt: number;
      recalledByUserId: string;
      recalledByName: string;
    }) => void;
    mockRepository.recallMessage.mockReturnValue(
      new Promise(resolve => {
        resolveRecall = resolve;
      }),
    );
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

    let operation!: Promise<boolean>;
    await act(async () => {
      operation = viewModel.recallMessage('10');
      await Promise.resolve();
    });

    expect(viewModel.messages[0]).toEqual(
      expect.objectContaining({
        isRecalled: true,
        message: 'Tin nhắn đã thu hồi',
        media: undefined,
        mediaType: undefined,
      }),
    );
    await expect(viewModel.recallMessage('10')).resolves.toBe(false);
    expect(mockRepository.recallMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRecall({
        messageId: '10',
        recalledAt: 1720000000,
        recalledByUserId: '1',
        recalledByName: 'Nguyen Van A',
      });
      await operation;
    });
    expect(viewModel.messages[0].recalledAt).toBe(1720000000);
    await act(async () => renderer.unmount());
  });

  it('rolls back when recall fails and refuses messages from another sender', async () => {
    mockRepository.recallMessage.mockRejectedValue(new Error('network'));
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

    let operation!: Promise<boolean>;
    await act(async () => {
      operation = viewModel.recallMessage('10');
      await operation.catch(() => undefined);
    });
    await expect(operation).rejects.toThrow('network');
    expect(viewModel.messages[0]).toEqual(initialMessage);

    mockRepository.getMessages.mockResolvedValueOnce([
      { ...initialMessage, id: '11', fromId: '2', isSentByMe: false },
    ]);
    await act(async () => {
      await viewModel.refreshLatest(false);
    });
    await expect(viewModel.recallMessage('11')).resolves.toBe(false);
    expect(mockRepository.recallMessage).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
