// Description: Keeps the initial chat skeleton aligned with the inverted message list.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../ChatScreen.tsx'),
  'utf8',
);

function styleBlock(styleName) {
  const match = source.match(
    new RegExp(`${styleName}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`),
  );
  return match?.[1] ?? '';
}

describe('Chat loading skeleton layout', () => {
  it('anchors placeholders beside the newest-message edge', () => {
    expect(styleBlock('messageSkeletonContainer')).toContain(
      "justifyContent: 'flex-end'",
    );
  });

  it('uses the same main spacing and shape as rendered message bubbles', () => {
    expect(styleBlock('messageSkeletonAvatar')).toContain('width: 28');
    expect(styleBlock('messageSkeletonBubble')).toContain(
      'paddingHorizontal: 12',
    );
    expect(styleBlock('messageSkeletonBubble')).toContain('paddingVertical: 8');
    expect(styleBlock('messageSkeletonBubble')).toContain('borderRadius: 16');
    expect(styleBlock('messageSkeletonRow')).toContain('marginBottom: 8');
    expect(source).toContain('styles.messageSkeletonTime');
  });
});
