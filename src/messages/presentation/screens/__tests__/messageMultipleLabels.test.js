const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/messages/presentation/screens/MessageScreen.tsx'),
  'utf8',
);

describe('multiple labels in the message list', () => {
  it('renders every label color in one horizontal scroll row', () => {
    const start = source.indexOf('function ChatLabelBadges');
    const end = source.indexOf('function getVisibleLastMessage', start);
    const block = source.slice(start, end);

    expect(block).toContain('<ScrollView');
    expect(block).toContain('horizontal');
    expect(block).toContain('labels.map(label =>');
    expect(block).not.toContain('labels.slice(');
    expect(block).not.toContain('+{labels.length');
  });

  it('keeps sender-aware post, location and link preview copy', () => {
    expect(source).toContain("sharedPost: 'Đã chia sẻ một bài viết'");
    expect(source).toContain("sharedPostMe: 'Bạn đã chia sẻ một bài viết'");
    expect(source).toContain("sharedLocation: 'Đã chia sẻ một vị trí'");
    expect(source).toContain("sharedLocationMe: 'Bạn đã chia sẻ một vị trí'");
    expect(source).toContain("sentLink: 'Đã gửi một liên kết'");
    expect(source).toContain("sentLinkMe: 'Bạn đã gửi một liên kết'");
    expect(source).toContain('Boolean(chat.lastMessageIsMine)');
  });

  it('marks the latest conversation preview as a reply without replacing its body', () => {
    expect(source).toContain('chat.lastMessageIsReply');
    expect(source).toContain('<CornerUpLeft size={14} color="#64748b" />');
    expect(source).toContain('messagePreviewText');
  });
});
