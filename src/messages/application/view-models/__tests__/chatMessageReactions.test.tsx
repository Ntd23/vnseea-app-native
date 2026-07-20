import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { ChatItem, MessageItem } from '../../../domain/types/messages.types';
import { useChatViewModel } from '../useChatViewModel';

jest.mock('../../../infrastructure/repositories/ApiMessagesRepository', () => {
  const repository = {
    getMessages: jest.fn(),
    markAsSeen: jest.fn(),
    setMessageReaction: jest.fn(),
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
  apiConfig: { webBaseUrl: 'https://v2.vnseea.vn' },
}));

const mockRepository = jest.requireMock(
  '../../../infrastructure/repositories/ApiMessagesRepository',
).__mockRepository as {
  getMessages: jest.Mock;
  markAsSeen: jest.Mock;
  setMessageReaction: jest.Mock;
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
  fromId: '2',
  toId: '1',
  message: 'Xin chao',
  time: 100,
  isSentByMe: false,
  seen: 1,
  reactions: {
    total: 0,
    myReaction: null,
    topReactions: [],
    breakdown: {},
  },
};

describe('useChatViewModel message reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.getMessages.mockResolvedValue([initialMessage]);
    mockRepository.markAsSeen.mockResolvedValue(undefined);
  });

  it('updates optimistically, adopts the server snapshot and blocks duplicate mutation', async () => {
    let resolveReaction!: (value: MessageItem['reactions']) => void;
    mockRepository.setMessageReaction.mockReturnValue(
      new Promise(resolve => {
        resolveReaction = resolve;
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
    expect(mockRepository.getMessages).toHaveBeenCalled();
    expect(viewModel.error).toBeNull();
    expect(viewModel.messages).toHaveLength(1);

    let request!: Promise<boolean>;
    await act(async () => {
      request = viewModel.setMessageReaction('10', 'love');
      await Promise.resolve();
    });
    expect(viewModel.messages[0].reactions.myReaction).toBe('love');
    mockRepository.getMessages.mockResolvedValueOnce([initialMessage]);
    await act(async () => {
      await viewModel.refreshLatest(false);
    });
    expect(viewModel.messages[0].reactions.myReaction).toBe('love');
    await expect(viewModel.setMessageReaction('10', 'haha')).resolves.toBe(false);
    expect(mockRepository.setMessageReaction).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReaction({
        total: 2,
        myReaction: 'love',
        topReactions: ['love', 'like'],
        breakdown: { love: 1, like: 1 },
      });
      await request;
    });
    expect(viewModel.messages[0].reactions.total).toBe(2);
    await act(async () => renderer.unmount());
  });

  it('rolls back the optimistic state when the request fails', async () => {
    mockRepository.setMessageReaction.mockRejectedValue(new Error('network'));
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
    expect(viewModel.error).toBeNull();
    expect(viewModel.messages).toHaveLength(1);

    let operation!: Promise<boolean>;
    await act(async () => {
      operation = viewModel.setMessageReaction('10', 'like');
      await operation.catch(() => undefined);
    });
    await expect(operation).rejects.toThrow('network');
    expect(viewModel.messages[0].reactions).toEqual(initialMessage.reactions);
    await act(async () => renderer.unmount());
  });
});
