import type { ChatItem, SendMessageResponse } from '../../../domain/types/messages.types';
import { createChatOutgoingQueue, type OutgoingChatSend } from '../chatOutgoingQueue';

jest.mock('../../../infrastructure/repositories/ApiMessagesRepository', () => ({
  createMessagesRepository: () => ({}),
}));
jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: { getSession: () => null },
}));

const chat = { id: '2', chatType: 'user', userId: '2' } as ChatItem;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function bubble(tempId: string, text: string): OutgoingChatSend {
  return {
    tempId,
    message: text,
    optimisticMessage: {
      id: tempId,
      conversationId: '',
      fromId: '1',
      toId: '2',
      message: text,
      time: 100,
      isSentByMe: true,
      seen: 0,
      deliveryState: 'sending',
      reactions: { total: 0, myReaction: null, topReactions: [], breakdown: {} },
    },
  };
}

function setup(owner = { id: '1' }) {
  const response = deferred<SendMessageResponse>();
  const send = jest.fn((..._args: unknown[]) => response.promise);
  const queue = createChatOutgoingQueue({
    send,
    fetchLatest: jest.fn(async () => []),
    ownerId: () => owner.id,
  });
  return { queue, send, response, owner };
}

describe('chatOutgoingQueue', () => {
  it('blocks thread reloads only while the send request is on the wire', async () => {
    const { queue, response } = setup();
    const sent = queue.enqueue(chat, [bubble('pending-1', 'Xin chào')]);
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    expect(queue.hasActiveRequest(chat)).toBe(true);

    response.resolve({ api_status: 200, sentMessages: [{ ...bubble('x', 'Xin chào').optimisticMessage, id: '10', deliveryState: undefined }] });
    await expect(sent).resolves.toEqual([true]);
    expect(queue.hasActiveRequest(chat)).toBe(false);
    expect(queue.getSnapshot(chat)).toEqual(
      expect.objectContaining({ pending: [], delivered: [expect.objectContaining({ id: '10' })] }),
    );
  });

  it('never shows one account the bubbles of another', () => {
    const { queue, owner } = setup();
    queue.enqueue(chat, [bubble('pending-1', 'Bí mật')]);
    expect(queue.getSnapshot(chat).pending).toHaveLength(1);

    owner.id = '7';
    expect(queue.getSnapshot(chat).pending).toEqual([]);
  });

  it('marks a failed send and reports it once', async () => {
    const { queue, send } = setup();
    send.mockRejectedValueOnce(new Error('Mất mạng'));
    const listener = jest.fn();
    queue.subscribe(chat, listener);

    await expect(queue.enqueue(chat, [bubble('pending-2', 'Lỗi')])).resolves.toEqual([false]);
    expect(queue.getSnapshot(chat)).toEqual(
      expect.objectContaining({
        pending: [expect.objectContaining({ id: 'pending-2', deliveryState: 'failed' })],
        failure: { tempId: 'pending-2', message: 'Mất mạng' },
      }),
    );
    expect(listener).toHaveBeenCalled();
  });
});
