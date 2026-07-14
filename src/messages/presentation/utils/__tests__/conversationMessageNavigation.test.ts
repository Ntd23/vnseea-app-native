import { findConversationMessageListItemIndex } from '../conversationMessageNavigation';

describe('conversation message list navigation', () => {
  const items = [
    {
      kind: 'message' as const,
      id: '10',
      message: { id: '10' },
    },
    {
      kind: 'media-group' as const,
      id: 'media-group-11-12',
      messages: [{ id: '11' }, { id: '12' }],
    },
  ];

  it('finds a regular message by its list item id', () => {
    expect(findConversationMessageListItemIndex(items, '10')).toBe(0);
  });

  it('finds a message nested in a media group', () => {
    expect(findConversationMessageListItemIndex(items, '12')).toBe(1);
  });

  it('returns minus one when no rendered item owns the message', () => {
    expect(findConversationMessageListItemIndex(items, '99')).toBe(-1);
  });
});
