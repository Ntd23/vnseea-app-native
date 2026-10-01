import type { MessageItem } from '../../../domain/types/messages.types';
import {
  formatMessageSendingStatus,
  getMediaGroupSendProgress,
} from '../messageSendStatus';

function mediaMessage(overrides: Partial<MessageItem>): MessageItem {
  return {
    id: '1',
    conversationId: '2',
    fromId: '1',
    toId: '2',
    message: '',
    mediaType: 'image',
    time: 100,
    isSentByMe: true,
    seen: 0,
    reactions: { total: 0, myReaction: null, topReactions: [], breakdown: {} },
    ...overrides,
  };
}

describe('formatMessageSendingStatus', () => {
  it('describes each send phase with a percentage when known', () => {
    expect(formatMessageSendingStatus(undefined)).toBe('Đang gửi...');
    expect(formatMessageSendingStatus({ phase: 'preparing' })).toBe(
      'Đang xử lý...',
    );
    expect(
      formatMessageSendingStatus({ phase: 'preparing', progress: 0.426 }),
    ).toBe('Đang xử lý 43%');
    expect(
      formatMessageSendingStatus({ phase: 'uploading', progress: 1.4 }),
    ).toBe('Đang gửi 100%');
  });
});

describe('getMediaGroupSendProgress', () => {
  it('counts delivered album items as complete', () => {
    expect(
      getMediaGroupSendProgress([
        mediaMessage({ id: '10' }),
        mediaMessage({
          id: 'pending-2',
          deliveryState: 'sending',
          sendProgress: { phase: 'uploading', progress: 0.5 },
        }),
        mediaMessage({ id: 'pending-3', deliveryState: 'sending' }),
        mediaMessage({ id: 'pending-4', deliveryState: 'sending' }),
      ]),
    ).toEqual({ phase: 'uploading', progress: 1.5 / 4 });
  });

  it('reports the preparing phase while any video is still compressing', () => {
    expect(
      getMediaGroupSendProgress([
        mediaMessage({
          id: 'pending-1',
          deliveryState: 'sending',
          sendProgress: { phase: 'preparing', progress: 0.2 },
        }),
        mediaMessage({ id: 'pending-2', deliveryState: 'sending' }),
      ]),
    ).toEqual({ phase: 'preparing', progress: 0.1 });
  });

  it('has no progress before any item starts or after all are delivered', () => {
    expect(
      getMediaGroupSendProgress([
        mediaMessage({ id: 'pending-1', deliveryState: 'sending' }),
      ]),
    ).toBeUndefined();
    expect(getMediaGroupSendProgress([mediaMessage({})])).toBeUndefined();
  });
});
