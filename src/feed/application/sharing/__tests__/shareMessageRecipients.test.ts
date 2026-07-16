import {
  getMessageShareChats,
  getMessageShareRecipient,
  getMessageRecipientIdsToSend,
  normalizeMessageRecipientIds,
  sendPostShareToMessageRecipients,
  type MessageRecipientStatuses,
} from '../shareMessageRecipients';
import type { ChatItem } from '../../../../messages/domain/types/messages.types';

describe('shareMessageRecipients', () => {
  it('deduplicates recipients and limits one share to ten people', () => {
    const ids = Array.from({ length: 12 }, (_, index) => String(index + 1));

    expect(normalizeMessageRecipientIds(['1', '', '1', ...ids])).toEqual(
      ids.slice(0, 10),
    );
  });

  it('sends to at most three recipients concurrently and captures failures', async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const statusEvents: Array<[string, string]> = [];

    const results = await sendPostShareToMessageRecipients({
      recipientIds: ['1', '2', '3', '4', '5'],
      concurrency: 9,
      onStatusChange: (recipientId, status) => {
        statusEvents.push([recipientId, status]);
      },
      send: async recipientId => {
        activeRequests += 1;
        maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
        await new Promise<void>(resolve => setTimeout(() => resolve(), 5));
        activeRequests -= 1;
        if (recipientId === '3') throw new Error('send failed');
      },
    });

    expect(maximumActiveRequests).toBe(3);
    expect(results).toEqual([
      { recipientId: '1', status: 'sent' },
      { recipientId: '2', status: 'sent' },
      { recipientId: '3', status: 'failed', error: 'send failed' },
      { recipientId: '4', status: 'sent' },
      { recipientId: '5', status: 'sent' },
    ]);
    expect(statusEvents).toContainEqual(['3', 'failed']);
  });

  it('keeps unique one-to-one and group conversations with namespaced recipient keys', () => {
    const rawChats = [
      {
        chatId: 'conversation-1',
        hasConversationRecord: true,
        chatType: 'user',
        participantId: '20',
        userId: '200',
        lastMessageTime: 20,
      },
      {
        chatId: 'conversation-2',
        hasConversationRecord: true,
        chatType: 'user',
        participantId: '20',
        lastMessageTime: 30,
      },
      {
        chatId: 'conversation-3',
        hasConversationRecord: true,
        chatType: 'user',
        userId: '30',
        lastMessageTime: 40,
      },
      {
        chatId: 'conversation-4',
        hasConversationRecord: true,
        chatType: 'user',
        userId: '10',
        lastMessageTime: 50,
      },
      {
        chatId: '20',
        chatType: 'group',
        groupId: '20',
        userId: '20',
        lastMessageTime: 60,
      },
      {
        chatId: 'discovered-contact',
        hasConversationRecord: false,
        chatType: 'user',
        participantId: '50',
        lastMessageTime: 70,
      },
      {
        chatId: 'page-conversation',
        chatType: 'page',
        participantId: '60',
        lastMessageTime: 80,
      },
    ];
    const chats = rawChats as unknown as ChatItem[];

    expect(getMessageShareChats(chats, '10')).toEqual([
      chats[4],
      chats[2],
      chats[1],
    ]);
    expect(getMessageShareRecipient(chats[1])).toEqual({
      key: 'user:20',
      kind: 'user',
      targetId: '20',
    });
    expect(getMessageShareRecipient(chats[4])).toEqual({
      key: 'group:20',
      kind: 'group',
      targetId: '20',
    });
  });

  it('retries only failed or unsent recipients', () => {
    const statuses: MessageRecipientStatuses = {
      '1': 'sent',
      '2': 'failed',
      '3': 'idle',
      '4': 'sending',
    };

    expect(
      getMessageRecipientIdsToSend(['1', '2', '3', '4'], statuses),
    ).toEqual(['2', '3']);
  });
});
