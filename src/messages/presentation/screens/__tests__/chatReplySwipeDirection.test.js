const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ChatScreen reply swipe direction', () => {
  it('uses outward swipe directions for incoming and outgoing messages', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('CornerUpRight');
    expect(source).toContain('const ReplySwipeIcon = isSentByMe ? CornerUpRight : CornerUpLeft;');
    expect(source).toContain('const isReplySwipe = isSentByMe ? dx > 10 : dx < -10;');
    expect(source).toContain('const shouldOpenReply = isSentByMe');
    expect(source).toContain('? drag > replySwipeTriggerDistance');
    expect(source).toContain(': drag < -replySwipeTriggerDistance;');
    expect(source).toContain('...(isSentByMe ? { left: 16 } : { right: 16 })');
    expect(source).toContain("flexDirection: isSentByMe ? 'row' : 'row-reverse'");
    expect(source).toContain('zIndex: 30');
    expect(source).toContain("backgroundColor: 'rgba(239, 246, 255, 0.96)'");
    expect(source).not.toContain('if (drag > 45 && onReply)');
  });

  it('shows visible swipe feedback and preserves call previews when replying', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain("type ReplyMediaType = 'image' | 'video' | 'audio' | 'file' | 'call';");
    expect(source).toContain("value === 'call'");
    expect(source).toContain('if (message.callEvent) {');
    expect(source).toContain('const title = getCallCardTitle(message.callEvent);');
    expect(source).toContain("? 'call'");
    expect(source).toContain('META_MEDIA_TYPE: *${originalMediaType}*');
    expect(source).toContain('replyCueTranslateX');
    expect(source).toContain('replyCueBackgroundColor');
    expect(source).toContain('<Animated.Text');
    expect(source).toContain('Trả lời tin nhắn');
    expect(source).toContain('replyingMessage.callEvent ? (');
  });

  it('renders chat video previews with a poster frame and tap-to-open shell', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('createCachedVideoPosterThumbnail');
    expect(source).toContain('getCachedVideoPosterThumbnail');
    expect(source).toContain('const posterCacheKey = cacheKey || uri;');
    expect(source).toContain('const [generatedPosterUri, setGeneratedPosterUri] = useState');
    expect(source).toContain('const [posterSize, setPosterSize] = useState');
    expect(source).toContain('Image.getSize(');
    expect(source).toContain('const videoFrameSize = useMemo');
    expect(source).toContain('const maxWidth = Math.min(Math.max(viewportWidth - 116, 210), 328);');
    expect(source).toContain('const maxHeight = Math.min(Math.max(viewportHeight * 0.32, 250), 380);');
    expect(source).toContain('videoPreviewShell');
    expect(source).toContain('cacheKey={message.id}');
    expect(source).not.toContain('Nhấn để xem');
    expect(source).not.toContain('getMediaFileName');
    expect(source).not.toContain('videoPreviewBottomBar');
  });

  it('renders product inquiry quick options as a serious grid instead of horizontal chips', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('const PRODUCT_INQUIRY_QUICK_OPTIONS = [');
    expect(source).toContain("label: 'Sản phẩm còn hàng không ạ?'");
    expect(source).toContain("label: 'Giá hiện tại là bao nhiêu ạ?'");
    expect(source).toContain("label: 'Tình trạng sản phẩm thế nào?'");
    expect(source).toContain("label: 'Cho mình xin thêm thông tin.'");
    expect(source).toContain('styles.productInquiryOptionGrid');
    expect(source).toContain("flexWrap: 'wrap'");
    expect(source).toContain('handleSendProductInquiryOption(option.message)');
    expect(source).not.toContain('Mặt hàng này còn không bạn yêu');
    expect(source).not.toContain('Cho mình xin thêm thông tin nhé con vợ');
    expect(source).not.toContain('Hàng hiệu à');
    expect(source).not.toMatch(/Quick Option Suggestion Chips[\s\S]*<ScrollView[\s\S]*horizontal/);
  });
});
