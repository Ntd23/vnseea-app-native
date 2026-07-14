type ConversationMessageListItem =
  | { kind: 'message'; id: string; message: { id: string } }
  | { kind: 'media-group'; id: string; messages: Array<{ id: string }> };

export function findConversationMessageListItemIndex(
  items: ConversationMessageListItem[],
  messageId: string,
) {
  return items.findIndex(item => {
    if (item.kind === 'message') {
      return item.message.id === messageId;
    }
    return item.messages.some(message => message.id === messageId);
  });
}
