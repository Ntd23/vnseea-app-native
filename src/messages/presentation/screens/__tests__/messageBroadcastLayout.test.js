const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/messages/presentation/screens/MessageScreen.tsx'),
  'utf8',
);

function occurrences(value, needle) {
  return value.split(needle).length - 1;
}

describe('message list and broadcast layout', () => {
  it('keeps a 44pt label hit target without stretching the preview row', () => {
    const start = source.indexOf('function ChatListItem');
    const end = source.indexOf('// Tab button', start);
    const block = source.slice(start, end);
    const jsxStart = block.indexOf('return (');
    const previewIndex = block.indexOf('{messagePreviewText}', jsxStart);
    const timeIndex = block.indexOf('{formatTime(chat.lastMessageTime, copy)}', jsxStart);

    expect(previewIndex).toBeGreaterThan(-1);
    expect(timeIndex).toBeGreaterThan(previewIndex);
    expect(block).toContain('MESSAGE_LIST_LABEL_BUTTON_SIZE = 32');
    expect(block).toContain('MESSAGE_LIST_LABEL_BUTTON_HIT_SLOP = 6');
    expect(block).toContain('width: MESSAGE_LIST_LABEL_BUTTON_SIZE');
    expect(block).toContain('height: MESSAGE_LIST_LABEL_BUTTON_SIZE');
    expect(block).toContain('hitSlop={MESSAGE_LIST_LABEL_BUTTON_HIT_SLOP}');
    expect(block).not.toContain('className="min-h-11 flex-row items-center"');
    expect(block).toContain('accessibilityLabel={copy.openLabels}');
    expect(block).toContain('numberOfLines={1}');
  });

  it('uses one real send action in place of quick send', () => {
    expect(source).not.toContain('Tính năng gửi nhanh đang được phát triển!');
    expect(source).not.toContain('Quick send feature is under development!');
    expect(occurrences(source, 'handleSendBroadcast().catch(() => undefined)')).toBe(1);
    expect(source).toContain('disabled={!canSendBroadcast}');
    expect(source).toContain('{copy.sendMessageButton}');
  });

  it('renders selected recipients as a bounded vertical list beside the compact composer', () => {
    expect(source).toContain(
      'const MESSAGE_BROADCAST_RECIPIENT_LIST_MAX_HEIGHT = 240;',
    );
    expect(source).toContain(
      'maxHeight: MESSAGE_BROADCAST_RECIPIENT_LIST_MAX_HEIGHT',
    );
    expect(source).toContain('nestedScrollEnabled');
    expect(source).toContain('accessibilityLabel={copy.chooseImage}');
    expect(source).toContain('setBroadcastAttachment(null)');

    const recipientsStart = source.indexOf('selectedBroadcastRecipientChats.map(');
    const recipientsEnd = source.indexOf(')', recipientsStart);
    const recipientsBlock = source.slice(recipientsStart, recipientsEnd);
    expect(recipientsStart).toBeGreaterThan(-1);
    expect(recipientsBlock).not.toContain('flex-wrap');
  });
});
