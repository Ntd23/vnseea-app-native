const { buildChatMessageListItems } = require('../messageMediaGrouping');

const createMessage = (id, overrides = {}) => ({
  id,
  conversationId: 'conversation-1',
  fromId: 'me',
  toId: 'friend',
  message: '',
  media: `file://${id}.jpg`,
  mediaType: 'image',
  reactions: {
    total: 0,
    myReaction: null,
    topReactions: [],
    breakdown: {},
  },
  time: Number(id),
  isSentByMe: true,
  seen: 0,
  ...overrides,
});

describe('message media grouping', () => {
  it('does not group separate single-image sends even when they are close together', () => {
    const messages = ['1', '2', '3', '4'].map(id => createMessage(id));

    expect(buildChatMessageListItems(messages).map(item => item.kind)).toEqual([
      'message',
      'message',
      'message',
      'message',
    ]);
  });

  it('groups media that share the same explicit send-action id', () => {
    const messages = ['1', '2', '3', '4'].map(id =>
      createMessage(id, { mediaGroupId: 'send-action-1' }),
    );

    const items = buildChatMessageListItems(messages);

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('media-group');
    expect(items[0].messages.map(message => message.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('keeps different send actions and group-chat senders separate', () => {
    const messages = [
      createMessage('1', { mediaGroupId: 'send-action-1' }),
      createMessage('2', { mediaGroupId: 'send-action-1' }),
      createMessage('3', {
        fromId: 'another-user',
        isSentByMe: false,
        mediaGroupId: 'send-action-1',
      }),
      createMessage('4', {
        fromId: 'another-user',
        isSentByMe: false,
        mediaGroupId: 'send-action-2',
      }),
    ];

    const items = buildChatMessageListItems(messages);

    expect(items).toHaveLength(3);
    expect(items[0].kind).toBe('media-group');
    expect(items[1].kind).toBe('message');
    expect(items[2].kind).toBe('message');
  });

  it('keeps an explicit media group stable when one image receives a reaction', () => {
    const messages = [
      createMessage('1', {
        mediaGroupId: 'send-action-1',
        reactions: {
          total: 1,
          myReaction: 'love',
          topReactions: ['love'],
          breakdown: { love: 1 },
        },
      }),
      createMessage('2', { mediaGroupId: 'send-action-1' }),
    ];

    expect(buildChatMessageListItems(messages)).toHaveLength(1);
    expect(buildChatMessageListItems(messages)[0].kind).toBe('media-group');
  });
});
