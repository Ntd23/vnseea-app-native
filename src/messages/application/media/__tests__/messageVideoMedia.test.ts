import type {
  MessageItem,
  MessageReactionSummary,
} from '../../../domain/types/messages.types';
import { preserveOptimisticVideoThumbnail } from '../messageVideoMedia';

const emptyReactions: MessageReactionSummary = {
  total: 0,
  myReaction: null,
  topReactions: [],
  breakdown: {},
};

function videoMessage(overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    fromId: '1',
    toId: '2',
    message: '',
    media: 'https://media.vnseea.vn/upload/videos/video.mp4',
    mediaType: 'video',
    reactions: emptyReactions,
    time: 1,
    isSentByMe: true,
    seen: 0,
    ...overrides,
  };
}

describe('message video media lifecycle', () => {
  it('keeps the local optimistic thumbnail when the send response omits it', () => {
    const optimistic = videoMessage({
      id: 'pending-1',
      media: 'file:///selected.mov',
      thumbnail: 'file:///selected-thumbnail.jpg',
      deliveryState: 'sending',
    });
    const sent = videoMessage({ thumbnail: undefined });

    expect(preserveOptimisticVideoThumbnail([sent], optimistic)).toEqual([
      expect.objectContaining({
        id: 'message-1',
        thumbnail: 'file:///selected-thumbnail.jpg',
      }),
    ]);
  });

  it('prefers the canonical thumbnail returned by the backend', () => {
    const optimistic = videoMessage({
      id: 'pending-1',
      thumbnail: 'file:///selected-thumbnail.jpg',
      deliveryState: 'sending',
    });
    const sent = videoMessage({
      thumbnail: 'https://media.vnseea.vn/upload/photos/server-thumbnail.jpg',
    });

    expect(preserveOptimisticVideoThumbnail([sent], optimistic)[0]?.thumbnail).toBe(
      'https://media.vnseea.vn/upload/photos/server-thumbnail.jpg',
    );
  });
});
